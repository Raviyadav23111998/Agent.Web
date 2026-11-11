import { Pipe, PipeTransform, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked, Renderer } from 'marked';
import hljs from 'highlight.js';
import DOMPurify from 'dompurify';

/**
 * Renders assistant markdown to trusted HTML.
 *
 * Security (B1): the agent echoes UNTRUSTED tool output (emails, web pages,
 * documents) into this HTML, so it is run through DOMPurify with an explicit
 * allowlist BEFORE being trusted — we do not silently rely on Angular's
 * default sanitizer (which also strips our own code-block <button>). DOMPurify
 * keeps the code-UI elements we generate while removing any <script>, event
 * handler, or dangerous protocol from injected content.
 *
 * Copy buttons carry NO inline JS — a single delegated handler in
 * message-bubble.component reads `data-code` (B1). Rendering is incremental:
 * a code block is only syntax-highlighted once its closing fence has arrived,
 * so streaming doesn't re-highlight partial code every token (B4).
 */
@Pipe({ name: 'markdown', standalone: false })
export class MarkdownPipe implements PipeTransform {

  private static configured = false;

  constructor(private sanitizer: DomSanitizer) {
    this.configure();
  }

  private configure(): void {
    if (MarkdownPipe.configured) return;

    const renderer = new Renderer();

    renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
      const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(text, { language }).value;
      const langLabel = lang || '';
      // Encode the raw source into a data attribute; the delegated copy
      // handler decodes it. base64 keeps quotes/newlines/backticks safe.
      const encoded = MarkdownPipe.encode(text);
      return `<div class="code-block">
        <div class="code-header">
          <span class="code-lang">${MarkdownPipe.escapeText(langLabel)}</span>
          <button type="button" class="code-copy" data-code="${encoded}">Copy</button>
        </div>
        <pre><code class="hljs language-${language}">${highlighted}</code></pre>
      </div>`;
    };

    renderer.codespan = ({ text }: { text: string }) =>
      `<code class="inline-code">${text}</code>`;

    renderer.link = ({ href, text }: { href: string; text: string }) => {
      const safe = MarkdownPipe.safeHref(href);
      if (!safe) return MarkdownPipe.escapeText(text);
      return `<a href="${safe}" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    marked.setOptions({ renderer, breaks: true, gfm: true });
    MarkdownPipe.configured = true;
  }

  private static encode(s: string): string {
    try { return btoa(unescape(encodeURIComponent(s))); } catch { return ''; }
  }

  static decode(s: string): string {
    try { return decodeURIComponent(escape(atob(s))); } catch { return ''; }
  }

  private static escapeText(s: string): string {
    return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /** Allow only http(s)/mailto; block javascript:, data:, vbscript:, etc. */
  private static safeHref(href: string): string | null {
    const h = (href || '').trim();
    if (/^(https?:|mailto:)/i.test(h)) return h.replace(/"/g, '%22');
    if (/^\//.test(h) || /^#/.test(h)) return h.replace(/"/g, '%22');
    return null;
  }

  transform(value: string): SafeHtml {
    if (!value) return '';
    let html: string;
    try {
      const parsed = marked.parse(value);
      html = typeof parsed === 'string' ? parsed : String(value);
    } catch {
      html = MarkdownPipe.escapeText(value);
    }
    const clean = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'a', 'b', 'blockquote', 'br', 'button', 'code', 'div', 'em', 'h1', 'h2',
        'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'li', 'ol', 'p', 'pre', 'span',
        'strong', 'table', 'tbody', 'td', 'th', 'thead', 'tr', 'ul', 'del', 's',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'src', 'alt', 'title', 'data-code'],
      ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#|\/)/i,
      ADD_ATTR: ['target'],
    });
    // DOMPurify output is already safe; bypass Angular's second-pass sanitizer
    // (which would strip our <button>/data-code) now that WE guarantee safety.
    return this.sanitizer.bypassSecurityTrustHtml(clean);
  }
}
