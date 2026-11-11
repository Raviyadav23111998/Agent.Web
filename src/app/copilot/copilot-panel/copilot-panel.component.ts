import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { CopilotBridgeService, CopilotEvent } from '../copilot-bridge.service';

interface PanelMessage {
  role: 'user' | 'assistant';
  content: string;
  thinking?: string;
  thinkingOpen?: boolean;
  error?: boolean;
}

@Component({
  selector: 'app-copilot-panel',
  templateUrl: './copilot-panel.component.html',
  styleUrls: ['./copilot-panel.component.scss'],
  standalone: false,
})
export class CopilotPanelComponent implements OnInit, OnDestroy {
  open = false;
  input = '';
  busy = false;
  status = '';
  conn: 'connecting' | 'ready' | 'closed' | 'error' | 'idle' = 'idle';
  messages: PanelMessage[] = [];
  private conversationId: string | null = null;
  private subs: Subscription[] = [];

  constructor(private bridge: CopilotBridgeService) {}

  ngOnInit(): void {
    this.subs.push(this.bridge.events$.subscribe(e => this.onEvent(e)));
    this.subs.push(this.bridge.state$.subscribe(s => (this.conn = s)));
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  toggle(): void {
    this.open = !this.open;
    if (this.open && this.conn === 'idle') this.bridge.connect().catch(() => {});
  }

  get last(): PanelMessage | undefined { return this.messages[this.messages.length - 1]; }

  async send(): Promise<void> {
    const text = this.input.trim();
    if (!text || this.busy) return;
    this.input = '';
    this.messages.push({ role: 'user', content: text });
    this.messages.push({ role: 'assistant', content: '' });
    this.busy = true;
    this.status = 'Thinking…';
    try {
      await this.bridge.sendChat(text, this.conversationId || undefined);
    } catch {
      this.busy = false;
      this.status = '';
      const m = this.last; if (m) { m.content = '⚠ Could not reach the assistant.'; m.error = true; }
    }
  }

  stop(): void { this.bridge.stop(); this.busy = false; this.status = ''; }

  onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); this.send(); }
  }

  private onEvent(e: CopilotEvent): void {
    const m = this.last;
    switch (e.event) {
      case 'message.start':
        if (e.conversationId) this.conversationId = e.conversationId;
        break;
      case 'status':
        this.status = e.state || '';
        break;
      case 'thinking.delta':
        if (m && m.role === 'assistant') { m.thinking = (m.thinking || '') + (e.content || ''); m.thinkingOpen = true; this.status = 'Thinking…'; }
        break;
      case 'message.delta':
        if (m && m.role === 'assistant') { m.content += e.content || ''; if (m.thinking) m.thinkingOpen = false; this.status = ''; }
        break;
      case 'tool.start':
        this.status = `Working on the screen: ${e.toolName || ''}…`;
        break;
      case 'tool.end':
        this.status = '';
        break;
      case 'message.end':
        if (m && m.role === 'assistant' && e.content) m.content = e.content;
        this.busy = false; this.status = '';
        break;
      case 'done':
        this.busy = false; this.status = '';
        break;
      case 'error':
        if (m && m.role === 'assistant') { m.content = `⚠ ${e.message || 'Error'}`; m.error = true; }
        this.busy = false; this.status = '';
        break;
    }
  }
}
