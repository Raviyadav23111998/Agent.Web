import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { PageContextService } from './page-context.service';
import { CopilotAction, CopilotResult } from './copilot.types';

@Injectable({ providedIn: 'root' })
export class PageActionService {
  constructor(
    private ctx: PageContextService,
    private router: Router,
  ) {}

  async perform(action: CopilotAction): Promise<CopilotResult> {
    try {
      switch (action.type) {
        case 'snapshot': return { ok: true, message: 'snapshot', data: this.ctx.snapshot() };
        case 'navigate': return await this.navigate(action.route || '');
        case 'fill':     return this.fill(action.handle!, action.value ?? '');
        case 'select':   return this.select(action.handle!, action.value ?? '');
        case 'check':    return this.check(action.handle!, action.value !== 'false');
        case 'click':    return this.click(action.handle!);
        case 'read':     return this.read(action.handle!);
        default:         return { ok: false, message: `Unknown action: ${(action as any).type}` };
      }
    } catch (e: any) {
      return { ok: false, message: `Action failed: ${e?.message || e}` };
    }
  }

  fill(handle: string, value: string): CopilotResult {
    const el = this.ctx.resolve(handle) as HTMLElement | null;
    if (!el) return this.notFound(handle);
    if (this.isDisabled(el)) return { ok: false, message: `'${handle}' is disabled/readonly` };

    if (el.isContentEditable) {
      el.textContent = value;
      this.dispatch(el, 'input');
      return { ok: true, message: `Filled editable '${handle}'` };
    }

    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) {
      return { ok: false, message: `'${handle}' is a ${el.tagName.toLowerCase()}, not a text field — pick a text/textarea element.` };
    }
    this.setNativeValue(el, value);
    this.dispatch(el, 'input');
    this.dispatch(el, 'change');
    this.dispatch(el, 'blur');
    return { ok: true, message: `Filled '${handle}' with "${value}"` };
  }

  select(handle: string, value: string): CopilotResult {
    const el = this.ctx.resolve(handle) as HTMLSelectElement | null;
    if (!el || el.tagName.toLowerCase() !== 'select') return this.notFound(handle, 'select');
    const opts = Array.from(el.options);

    const match = opts.find(o => o.text.trim().toLowerCase() === value.trim().toLowerCase())
               || opts.find(o => o.value === value)
               || opts.find(o => o.text.trim().toLowerCase().includes(value.trim().toLowerCase()));
    if (!match) {
      return { ok: false, message: `No option '${value}'. Options: ${opts.map(o => o.text.trim()).join(', ')}` };
    }
    el.value = match.value;
    this.dispatch(el, 'input');
    this.dispatch(el, 'change');
    return { ok: true, message: `Selected '${match.text.trim()}' in '${handle}'` };
  }

  check(handle: string, checked: boolean): CopilotResult {
    const el = this.ctx.resolve(handle) as HTMLInputElement | null;
    if (!el) return this.notFound(handle);
    if (el.checked !== checked) {
      el.checked = checked;
      this.dispatch(el, 'input');
      this.dispatch(el, 'change');
    }
    return { ok: true, message: `${checked ? 'Checked' : 'Unchecked'} '${handle}'` };
  }

  click(handle: string): CopilotResult {
    const el = this.ctx.resolve(handle);
    if (!el) return this.notFound(handle);
    if (this.isDisabled(el)) return { ok: false, message: `'${handle}' is disabled` };
    el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
    el.click();
    return { ok: true, message: `Clicked '${handle}'` };
  }

  read(handle: string): CopilotResult {
    const el = this.ctx.resolve(handle) as HTMLInputElement | null;
    if (!el) return this.notFound(handle);
    const val = (el as any).value ?? el.textContent ?? '';
    return { ok: true, message: `Read '${handle}'`, data: String(val).trim() };
  }

  async navigate(route: string): Promise<CopilotResult> {
    if (!route) return { ok: false, message: 'No route given' };
    const ok = await this.router.navigateByUrl(route).catch(() => false);
    return ok
      ? { ok: true, message: `Navigated to ${route}` }
      : { ok: false, message: `Navigation to ${route} failed (route may not exist)` };
  }

  private notFound(handle: string, expected?: string): CopilotResult {
    return { ok: false, message: `Element '${handle}'${expected ? ` (${expected})` : ''} not found — take a fresh snapshot.` };
  }

  private isDisabled(el: HTMLElement): boolean {
    return (el as HTMLInputElement).disabled === true ||
           el.getAttribute('aria-disabled') === 'true' ||
           (el as HTMLInputElement).readOnly === true;
  }

  private setNativeValue(el: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    const proto = el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) { setter.call(el, value); } else { (el as any).value = value; }
  }

  private dispatch(el: HTMLElement, type: string): void {
    el.dispatchEvent(new Event(type, { bubbles: true }));
  }
}
