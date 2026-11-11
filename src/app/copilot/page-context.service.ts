import { Injectable } from '@angular/core';
import { ElementKind, PageElement, PageSnapshot } from './copilot.types';

const HANDLE_ATTR = 'data-cp';
const MAX_ELEMENTS = 120;
const MAX_LABEL = 80;

@Injectable({ providedIn: 'root' })
export class PageContextService {
  private _seq = 0;

  snapshot(): PageSnapshot {
    this._seq = 0;
    const seen = new Set<Element>();
    const elements: PageElement[] = [];

    const selector = [
      'input:not([type=hidden])',
      'textarea',
      'select',
      'button',
      'a[href]',
      '[role=button]', '[role=menuitem]', '[role=tab]', '[role=option]',
      '[role=switch]', '[role=checkbox]', '[role=radio]', '[role=link]', '[role=combobox]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable=""]',
      '[contenteditable=true]',
    ].join(',');

    const push = (el: HTMLElement, kind: ElementKind) => {
      const handle = `cp${++this._seq}`;
      el.setAttribute(HANDLE_ATTR, handle);
      elements.push({
        id: handle,
        kind,
        label: this._label(el, kind),
        value: this._value(el, kind),
        options: kind === 'select'
          ? Array.from((el as HTMLSelectElement).options).map(o => o.text.trim()).slice(0, 40)
          : undefined,
        disabled: this._isDisabled(el),
        required: el.hasAttribute('required') || el.getAttribute('aria-required') === 'true',
        selector: this._cssPath(el),
      });
    };

    const nodes = Array.from(document.querySelectorAll<HTMLElement>(selector));
    for (const el of nodes) {
      if (elements.length >= MAX_ELEMENTS) break;
      if (seen.has(el) || this._isOwnUi(el) || !this._isVisible(el)) continue;
      seen.add(el);
      const kind = this._classify(el);
      if (!kind) continue;
      push(el, kind);
    }

    this._collectClickables(seen, elements, push);

    return {
      url: location.href,
      route: location.pathname,
      title: document.title,
      heading: this._heading(),
      elements,
      capturedAt: Date.now(),
    };
  }

  resolve(handle: string): HTMLElement | null {
    return document.querySelector<HTMLElement>(`[${HANDLE_ATTR}="${CSS.escape(handle)}"]`);
  }

  private _classify(el: HTMLElement): ElementKind | null {
    const tag = el.tagName.toLowerCase();
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'select';
    if (tag === 'a') return 'link';
    if (tag === 'button') return 'button';
    if (el.isContentEditable) return 'editable';
    if (tag === 'input') {
      const t = (el as HTMLInputElement).type;
      if (t === 'checkbox') return 'checkbox';
      if (t === 'radio') return 'radio';
      if (t === 'submit' || t === 'button') return 'button';
      return 'text';
    }
    const role = el.getAttribute('role');
    if (role === 'checkbox' || role === 'switch') return 'checkbox';
    if (role === 'radio') return 'radio';
    if (role === 'combobox' || role === 'listbox') return 'select';
    if (role === 'link') return 'link';
    if (role === 'button' || role === 'menuitem' || role === 'tab' || role === 'option') return 'button';
    if (el.hasAttribute('tabindex')) return 'button';
    return null;
  }

  private _collectClickables(
    seen: Set<Element>,
    elements: PageElement[],
    push: (el: HTMLElement, kind: ElementKind) => void,
  ): void {

    const candidates = Array.from(document.querySelectorAll<HTMLElement>(
      'div, span, li, tr, td, [class*="card"], [class*="item"], [class*="tile"], [class*="option"]'
    ));
    let scanned = 0;
    for (const el of candidates) {
      if (elements.length >= MAX_ELEMENTS || scanned >= 800) break;
      scanned++;
      if (seen.has(el) || this._isOwnUi(el) || !this._isVisible(el)) continue;
      if (getComputedStyle(el).cursor !== 'pointer') continue;

      if (el.querySelector(`[${HANDLE_ATTR}]`)) continue;
      const label = this._text(el);
      if (!label || label.length > MAX_LABEL) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width > 600 && rect.height > 400) continue;
      seen.add(el);
      push(el, 'button');
    }
  }

  readMainText(maxChars = 4000): string {
    const main = document.querySelector('main, .admin-container, [role=main], .content-section') || document.body;
    const text = (main as HTMLElement).innerText || '';
    return text.replace(/\n{3,}/g, '\n\n').trim().slice(0, maxChars);
  }

  private _value(el: HTMLElement, kind: ElementKind): string | undefined {
    if (kind === 'button' || kind === 'link') return this._text(el).slice(0, MAX_LABEL);
    if (kind === 'checkbox' || kind === 'radio') {
      return (el as HTMLInputElement).checked ? 'true' : 'false';
    }
    if (kind === 'select') {
      const s = el as HTMLSelectElement;
      return s.options[s.selectedIndex]?.text?.trim();
    }
    if (kind === 'editable') return (el.textContent || '').trim().slice(0, MAX_LABEL);
    const v = (el as HTMLInputElement).value || '';

    if ((el as HTMLInputElement).type === 'password') return v ? '••••••' : '';
    return v.slice(0, MAX_LABEL);
  }

  private _label(el: HTMLElement, kind: ElementKind): string {
    if (kind === 'button' || kind === 'link') {
      return (this._text(el) || el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, MAX_LABEL);
    }

    const aria = el.getAttribute('aria-label');
    if (aria) return aria.slice(0, MAX_LABEL);

    const id = el.getAttribute('id');
    if (id) {
      const lbl = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      if (lbl) return this._text(lbl).slice(0, MAX_LABEL);
    }
    const wrapLabel = el.closest('label');
    if (wrapLabel) return this._text(wrapLabel).slice(0, MAX_LABEL);

    const ph = el.getAttribute('placeholder');
    if (ph) return ph.slice(0, MAX_LABEL);

    const labelledby = el.getAttribute('aria-labelledby');
    if (labelledby) {
      const ref = document.getElementById(labelledby);
      if (ref) return this._text(ref).slice(0, MAX_LABEL);
    }
    return (el.getAttribute('name') || el.getAttribute('title') || '').slice(0, MAX_LABEL);
  }

  private _heading(): string | undefined {
    const h = document.querySelector('main h1, main h2, h1, h2');
    return h ? this._text(h).slice(0, MAX_LABEL) : undefined;
  }

  private _text(el: Element): string {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }

  private _isDisabled(el: HTMLElement): boolean {
    return (el as HTMLInputElement).disabled === true ||
           el.getAttribute('aria-disabled') === 'true' ||
           (el as HTMLInputElement).readOnly === true;
  }

  private _isOwnUi(el: Element): boolean {
    return !!el.closest('app-copilot-panel');
  }

  private _isVisible(el: HTMLElement): boolean {
    if (!el.isConnected) return false;
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  private _cssPath(el: Element): string {
    const parts: string[] = [];
    let node: Element | null = el;
    let depth = 0;
    while (node && node.nodeType === 1 && depth < 4) {
      let part = node.tagName.toLowerCase();
      const id = node.getAttribute('id');
      if (id) { parts.unshift(`${part}#${id}`); break; }
      const cls = (node.getAttribute('class') || '').split(/\s+/).filter(Boolean)[0];
      if (cls) part += `.${cls}`;
      parts.unshift(part);
      node = node.parentElement;
      depth++;
    }
    return parts.join(' > ');
  }
}
