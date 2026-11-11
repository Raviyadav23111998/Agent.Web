import { Injectable } from '@angular/core';
import { PageContextService } from './page-context.service';
import { PageActionService } from './page-action.service';
import { CopilotAction, CopilotResult, PageSnapshot } from './copilot.types';

@Injectable({ providedIn: 'root' })
export class CopilotEngineService {
  constructor(
    private ctx: PageContextService,
    private actions: PageActionService,
  ) {}

  describePage(): PageSnapshot {
    return this.ctx.snapshot();
  }

  readPageText(): string {
    return this.ctx.readMainText();
  }

  /** The app's STATIC navigation map — visible sidebar/nav links with their
   *  routes. Sent once per session so the agent can page_navigate(route)
   *  directly instead of exploring the sidebar to discover routes. Fail-soft:
   *  returns [] if nothing recognisable is found. */
  scanNavigation(): Array<{ label: string; route: string; group?: string }> {
    const out = new Map<string, { label: string; route: string; group?: string }>();
    const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>(
      'nav a[href], aside a[href], .sidebar a[href], [role=navigation] a[href], a[routerLink]',
    ));
    for (const a of anchors) {
      if (!this._vis(a) || a.closest('app-copilot-panel')) continue;
      const label = (a.textContent || a.getAttribute('aria-label') || '')
        .replace(/\s+/g, ' ').trim().slice(0, 60);
      let route = '';
      try { route = new URL(a.href, location.origin).pathname; }
      catch { route = a.getAttribute('href') || ''; }
      if (!label || !route.startsWith('/')) continue;
      const group = (a.closest('[data-nav-group]')?.getAttribute('data-nav-group') || '')
        .trim() || undefined;
      out.set(`${label}|${route}`, group ? { label, route, group } : { label, route });
    }
    return Array.from(out.values());
  }

  private _vis(el: HTMLElement): boolean {
    const s = getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && el.isConnected && !el.closest('app-copilot-panel');
  }
  private _lbl(el: HTMLElement, click: boolean): string {
    if (click) return (el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    const aria = el.getAttribute('aria-label'); if (aria) return aria.slice(0, 80);
    const id = el.getAttribute('id');
    if (id) { const l = document.querySelector(`label[for="${CSS.escape(id)}"]`); if (l) return (l.textContent || '').trim().slice(0, 80); }
    const wl = el.closest('label'); if (wl) return (wl.textContent || '').trim().slice(0, 80);
    return (el.getAttribute('placeholder') || el.getAttribute('name') || '').slice(0, 80);
  }
  private _elsFor(action: string): HTMLElement[] {
    const sel = action === 'click'
      ? 'button,a,[role=button],[role=menuitem],[role=tab],[role=link],input[type=submit],input[type=button],[tabindex]:not([tabindex="-1"])'
      : 'input:not([type=hidden]),textarea,select';
    return (Array.from(document.querySelectorAll<HTMLElement>(sel))).filter(e => this._vis(e));
  }
  private _findByLabel(target: string, action: string): HTMLElement | null {
    const t = (target || '').trim().toLowerCase(); if (!t) return null;
    const labeled = this._elsFor(action).map(el => ({ el, label: this._lbl(el, action === 'click').toLowerCase() })).filter(x => x.label);
    const pick = labeled.find(x => x.label === t) || labeled.find(x => x.label.startsWith(t))
              || labeled.find(x => x.label.includes(t)) || labeled.find(x => t.includes(x.label));
    return pick ? pick.el : null;
  }

  observeText(): string {
    const lines: string[] = [], seen = new Set<Element>();
    for (const el of this._elsFor('input')) {
      if (seen.has(el)) continue; seen.add(el);
      const tag = el.tagName.toLowerCase();
      const kind = tag === 'select' ? 'select' : tag === 'textarea' ? 'textarea'
        : (el as HTMLInputElement).type === 'checkbox' ? 'checkbox' : 'text';
      const lbl = this._lbl(el, false); if (!lbl) continue;
      let v = '';
      if (kind === 'select') v = ' options: ' + Array.from((el as HTMLSelectElement).options).map(o => o.text.trim()).slice(0, 30).join(' | ');
      else if ((el as HTMLInputElement).type === 'password') v = (el as HTMLInputElement).value ? ' = ••••' : '';
      else if ((el as HTMLInputElement).value) v = ' = ' + JSON.stringify((el as HTMLInputElement).value.slice(0, 40));
      lines.push(`  ${kind} "${lbl}"${(el as HTMLInputElement).required ? ' (required)' : ''}${v}`);
    }
    const seenL = new Set<string>();
    for (const el of this._elsFor('click')) {
      if (seen.has(el)) continue; const lbl = this._lbl(el, true);
      if (!lbl || seenL.has(lbl)) continue;
      // Skip chart/SVG noise — labels containing CSS syntax are never real nav items.
      if (/[{}:;]/.test(lbl)) continue;
      seenL.add(lbl);
      lines.push(`  ${el.tagName.toLowerCase() === 'a' ? 'link' : 'button'} "${lbl}"`);
    }
    return `Page: ${location.pathname} — "${document.title}"\n${lines.length} elements:\n${lines.join('\n')}`;
  }

  async act(steps: any): Promise<string> {
    if (typeof steps === 'string') { try { steps = JSON.parse(steps); } catch { return 'FAILED: `steps` must be a JSON array.'; } }
    if (!Array.isArray(steps)) return 'FAILED: `steps` must be an array of {do,target,value}.';
    const out: string[] = [];
    for (const s of steps) {
      const doo = String(s?.do || s?.action || '').toLowerCase(), tgt = s?.target || s?.label || '', val = s?.value;
      const el = this._findByLabel(tgt, doo === 'click' ? 'click' : 'input');
      if (!el) { out.push(`✗ ${doo} "${tgt}": not found`); break; }
      if (doo === 'fill') {
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) { await this.run({ type: 'fill', handle: this._stamp(el), value: val == null ? '' : String(val) }); out.push(`✓ filled "${tgt}"`); }
        else out.push(`✗ "${tgt}" is not a text field`);
      } else if (doo === 'select') { const r = await this.run({ type: 'select', handle: this._stamp(el), value: String(val) }); out.push((r.ok ? '✓ ' : '✗ ') + r.message); }
      else if (doo === 'check') { await this.run({ type: 'check', handle: this._stamp(el), value: (val === false || val === 'false') ? 'false' : 'true' }); out.push(`✓ checked "${tgt}"`); }
      else if (doo === 'click') { await this.run({ type: 'click', handle: this._stamp(el) }); await this._settle(450); out.push(`✓ clicked "${tgt}"`); }
      else out.push(`✗ unknown action "${doo}"`);
    }
    return out.join('\n') + '\n\n' + this.observeText();
  }

  private _stamp(el: HTMLElement): string {
    const h = 'cp_act'; el.setAttribute('data-cp', h); return h;
  }

  async waitForSettle(maxMs = 4000): Promise<void> {
    const start = Date.now();
    let prevCount = -1;
    let stable = 0;
    while (Date.now() - start < maxMs) {
      await this._settle(220);
      const loading = document.querySelector(
        '.loading-state, .spinner, [aria-busy="true"], .skeleton, .loading'
      );
      const count = document.querySelectorAll(
        'input,textarea,select,button,a[href],[role=button]'
      ).length;
      if (!loading && count === prevCount && count > 0) {
        if (++stable >= 2) return;
      } else {
        stable = 0;
      }
      prevCount = count;
    }
  }

  run(action: CopilotAction): Promise<CopilotResult> {
    return this.actions.perform(action);
  }

  async runBatch(actions: CopilotAction[]): Promise<CopilotResult[]> {
    const results: CopilotResult[] = [];
    for (const action of actions) {
      const r = await this.run(action);
      results.push(r);
      if (!r.ok) break;
      if (action.type === 'navigate' || action.type === 'click') {
        await this._settle();
        this.ctx.snapshot();
      }
    }
    return results;
  }

  exposeForDebug(): void {
    (window as any).__copilot = {
      describePage: () => { const s = this.describePage(); console.table(s.elements); return s; },
      run: (a: CopilotAction) => this.run(a),
    };
    // eslint-disable-next-line no-console
    console.info('[copilot] debug API ready: window.__copilot.describePage()');
  }

  private _settle(ms = 120): Promise<void> {
    return new Promise(res => setTimeout(res, ms));
  }
}
