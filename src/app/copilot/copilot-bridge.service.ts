import { Injectable, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from '../services/auth.service';
import { CopilotEngineService } from './copilot-engine.service';
import { CopilotAction } from './copilot.types';

export interface CopilotEvent {
  event: string;
  content?: string;
  conversationId?: string;
  state?: string;
  toolName?: string;
  toolArgs?: any;
  message?: string;
  [k: string]: any;
}

const PAGE_TOOLS = new Set([
  'page_observe', 'page_act',
  'page_snapshot', 'page_fill', 'page_select', 'page_click', 'page_navigate',
  'page_wait', 'page_read',
]);

@Injectable({ providedIn: 'root' })
export class CopilotBridgeService {
  private ws: WebSocket | null = null;
  private authed = false;
  private connecting = false;

  readonly events$ = new Subject<CopilotEvent>();

  readonly state$ = new Subject<'connecting' | 'ready' | 'closed' | 'error'>();

  constructor(
    private auth: AuthService,
    private engine: CopilotEngineService,
    private zone: NgZone,
  ) {}

  private wsUrl(): string {
    const base = (environment.apiUrl || location.origin).replace(/^http/, 'ws');

    return `${base}/v1/ws?tenantDomain=${encodeURIComponent(location.hostname)}`;
  }

  connect(): Promise<void> {
    if (this.authed && this.ws?.readyState === WebSocket.OPEN) return Promise.resolve();
    if (this.connecting) return Promise.resolve();
    this.connecting = true;
    this.state$.next('connecting');

    return new Promise<void>((resolve, reject) => {
      const token = this.auth.getActiveSession()?.accessToken;
      const ws = new WebSocket(this.wsUrl());
      this.ws = ws;

      ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: `Bearer ${token}` }));

      ws.onmessage = (ev) => {
        let msg: any;
        try { msg = JSON.parse(ev.data); } catch { return; }

        this.zone.run(() => this.onMessage(msg, resolve, reject));
      };

      ws.onerror = () => { this.connecting = false; this.state$.next('error'); reject(new Error('ws error')); };
      ws.onclose = () => { this.authed = false; this.connecting = false; this.state$.next('closed'); };
    });
  }

  private onMessage(msg: any, resolve?: () => void, reject?: (e: any) => void): void {
    switch (msg.type) {
      case 'auth_ok':
        this.authed = true;
        this.connecting = false;
        this.state$.next('ready');
        resolve?.();
        break;

      case 'event':
        this.events$.next(msg as CopilotEvent);
        break;

      case 'tool_request':
        this.handleToolRequest(msg);
        break;

      case 'error':
        this.events$.next({ event: 'error', message: msg.message });
        reject?.(new Error(msg.message));
        break;
    }
  }

  async sendChat(message: string, conversationId?: string): Promise<void> {
    await this.connect();
    this.ws?.send(JSON.stringify({
      type: 'chat',
      message,
      conversationId: conversationId || null,

      context: {
        page: this.engine.describePage(),
        nav: this.engine.scanNavigation(),
      },
    }));
  }

  stop(): void { this.ws?.send(JSON.stringify({ type: 'stop' })); }

  private async handleToolRequest(msg: any): Promise<void> {
    const { requestId, toolName, toolArgs } = msg;
    if (!PAGE_TOOLS.has(toolName)) {
      this.ws?.send(JSON.stringify({
        type: 'tool_error', requestId,
        error: `Tool '${toolName}' is not a page tool and cannot run in the browser.`,
      }));
      return;
    }
    try {
      const result = await this.execPageTool(toolName, toolArgs || {});
      this.ws?.send(JSON.stringify({ type: 'tool_result', requestId, result }));
    } catch (e: any) {
      this.ws?.send(JSON.stringify({ type: 'tool_error', requestId, error: String(e?.message || e) }));
    }
  }

  private async execPageTool(name: string, args: any): Promise<string> {
    if (name === 'page_observe') {
      await this.engine.waitForSettle();
      return this.engine.observeText();
    }
    if (name === 'page_act') {
      const r = await this.engine.act(args.steps);
      await this.engine.waitForSettle();
      return r;
    }
    if (name === 'page_wait') {
      await this.engine.waitForSettle();
      return this.snapshotText('Page settled.');
    }
    if (name === 'page_read') {
      return `Page text (${location.pathname}):\n${this.engine.readPageText()}`;
    }
    if (name === 'page_snapshot') {
      await this.engine.waitForSettle();
      return this.snapshotText();
    }
    if (name === 'page_navigate') {
      const r = await this.engine.run({ type: 'navigate', route: args.route });
      if (!r.ok) return `FAILED: ${r.message}`;
      await this.engine.waitForSettle();

      return this.snapshotText(r.message);
    }
    if (name === 'page_click') {
      const r = await this.engine.run({ type: 'click', handle: args.handle });
      if (!r.ok) return `FAILED: ${r.message}`;
      await this.engine.waitForSettle(2500);
      return this.snapshotText(r.message);
    }

    const action: CopilotAction =
      name === 'page_fill'   ? { type: 'fill',   handle: args.handle, value: args.value }
    : name === 'page_select' ? { type: 'select', handle: args.handle, value: args.value }
    : { type: 'snapshot' };
    const r = await this.engine.run(action);
    return r.ok ? `OK: ${r.message}` : `FAILED: ${r.message}`;
  }

  private snapshotText(prefix?: string): string {
    const snap = this.engine.describePage();
    const lines = snap.elements.map(e =>
      `${e.id} [${e.kind}]${e.disabled ? '(disabled)' : ''} "${e.label}"` +
      (e.value ? ` = ${JSON.stringify(e.value)}` : '') +
      (e.options ? ` options: ${e.options.join(' | ')}` : ''));
    return (prefix ? `OK: ${prefix}\n` : '') +
           `Page: ${snap.route} — "${snap.heading || snap.title}"\n` +
           `${snap.elements.length} elements (use these exact ids — they change after each action):\n` +
           `${lines.join('\n')}\n` +
           `(If a value you need isn't listed, call page_read.)`;
  }
}
