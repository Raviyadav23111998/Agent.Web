import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Subject, firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

/** A file attached to a message — Part 1 (user→model) and Part 2 (model→user). */
export interface Attachment {
  fileId?: number;
  kind: 'image' | 'document' | 'audio' | 'video' | string;
  mediaType: string;
  fileName: string;
  size?: number;
  localUrl?: string;     // object URL for instant preview / optimistic echo
  uploading?: boolean;
  error?: boolean;
}

/** Multimodal capability matrix for the selected native model. */
export interface ModelCapabilities {
  input: { image: boolean; pdf: boolean; audio: boolean; video: boolean };
  output: { image: boolean; audio: boolean; video: boolean };
  max_image_edge: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: ToolExecution[];
  createdAt?: string;
  messageId?: number;
  isError?: boolean;
  canRetry?: boolean;
  sources?: BrainSource[];
  thinking?: string;
  thinkingDone?: boolean;
  attachments?: Attachment[];
}

export interface BrainSource {
  title: string;
  documentId?: string;
  type?: string;
  sourcePath?: string;
  snippet?: string;
}

export interface ToolExecution {
  name: string;
  status: 'running' | 'done' | 'error';
  result?: string;
  args?: any;
  startedAt?: number;
  duration?: number;
}

export interface Conversation {
  conversationId: string;
  title: string | null;
  agentId: number | null;
  model: string | null;
  messageCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationDetail extends Conversation {
  messages: ChatMessage[];
}

export interface SSEEvent {
  event: string;
  content?: string;
  conversationId?: string;
  state?: string;
  label?: string;
  message?: string;
  toolName?: string;
  toolArgs?: any;
  toolResult?: any;
  tokenCount?: number;

  conversationTokens?: number;
  conversationCostUsd?: number;

  steps?: string[];

  sources?: BrainSource[];

  approvalId?: string;
  timeout_s?: number;

  // Part 2 — model-generated media artifact
  fileId?: number;
  kind?: string;
  mediaType?: string;
}

export interface ConversationUsage {
  tokens: number;
  costUsd: number;
}

export interface PendingApproval {
  approvalId: string;
  toolName: string;
  toolArgs: any;
  timeoutS: number;
  requestedAt: number;
}

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
  agentId?: number | null;
  model?: string | null;
  stream: boolean;
  attachmentIds?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {

  private apiBase = `${environment.apiUrl}/v1/chat`;
  private abortController: AbortController | null = null;

  public activeConversationId$ = new BehaviorSubject<string | null>(null);
  public conversations$ = new BehaviorSubject<Conversation[]>([]);
  public messages$ = new BehaviorSubject<ChatMessage[]>([]);
  public isStreaming$ = new BehaviorSubject<boolean>(false);
  public streamStatus$ = new BehaviorSubject<string>('');
  public activeTools$ = new BehaviorSubject<ToolExecution[]>([]);

  public pendingApprovals$ = new BehaviorSubject<PendingApproval[]>([]);

  public usage$ = new BehaviorSubject<ConversationUsage>({ tokens: 0, costUsd: 0 });

  public currentPlan$ = new BehaviorSubject<string[]>([]);

  public sseEvent$ = new Subject<SSEEvent>();

  // Multimodal: capabilities of the selected model (drives composer warnings)
  // and a warning stream for server-side "model can't read X" notices.
  public capabilities$ = new BehaviorSubject<ModelCapabilities | null>(null);
  public warning$ = new Subject<string>();
  private _pendingAttachments: Attachment[] = [];

  // B2 — messages typed while a reply is streaming are queued and sent when
  // the current turn finishes (Claude-faithful: queue-next, not mid-turn
  // steer). The composer is never blocked.
  public queuedMessages$ = new BehaviorSubject<string[]>([]);

  // B8 — the last prompt is preserved so a failed turn can be retried without
  // the user retyping.
  private lastPrompt: string | null = null;
  private retryCount = 0;
  private readonly MAX_AUTO_RETRIES = 2;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  loadConversations(): void {
    this.http.get<Conversation[]>(`${this.apiBase}/conversations`)
      .subscribe({
        next: (convs) => this.conversations$.next(convs),
        error: (err) => console.error('Failed to load conversations', err)
      });
  }

  loadConversation(conversationId: string): void {
    this.activeConversationId$.next(conversationId);
    this.usage$.next({ tokens: 0, costUsd: 0 });
    this.currentPlan$.next([]);
    this.http.get<ConversationDetail>(`${this.apiBase}/conversations/${conversationId}`)
      .subscribe({
        next: (detail) => {
          this.messages$.next(detail.messages || []);
        },
        error: (err) => console.error('Failed to load conversation', err)
      });
  }

  deleteConversation(conversationId: string): void {
    this.http.delete(`${this.apiBase}/conversations/${conversationId}`)
      .subscribe({
        next: () => {
          const current = this.conversations$.value;
          this.conversations$.next(current.filter(c => c.conversationId !== conversationId));
          if (this.activeConversationId$.value === conversationId) {
            this.newChat();
          }
        },
        error: (err) => console.error('Failed to delete conversation', err)
      });
  }

  newChat(): void {
    this.stopGeneration();
    this.activeConversationId$.next(null);
    this.messages$.next([]);
    this.streamStatus$.next('');
    this.activeTools$.next([]);
    this.pendingApprovals$.next([]);
    this.usage$.next({ tokens: 0, costUsd: 0 });
    this.currentPlan$.next([]);
    this.queuedMessages$.next([]);
    this.lastPrompt = null;
  }

  stopGeneration(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.isStreaming$.next(false);
    this.streamStatus$.next('');
    this.activeTools$.next([]);
    // A manual stop cancels anything queued — the user is taking back control.
    this.queuedMessages$.next([]);
  }

  /** Remove one queued message before it is sent (user changed their mind). */
  removeQueued(index: number): void {
    const q = [...this.queuedMessages$.value];
    if (index >= 0 && index < q.length) {
      q.splice(index, 1);
      this.queuedMessages$.next(q);
    }
  }

  /** B8 — re-send the last prompt after a failed/errored turn. */
  retryLast(): void {
    if (!this.lastPrompt || this.isStreaming$.value) return;
    const prompt = this.lastPrompt;
    // Drop a trailing failed assistant bubble so the retry replaces it.
    const msgs = [...this.messages$.value];
    const last = msgs[msgs.length - 1];
    if (last && last.role === 'assistant' && (last.isError || !last.content)) {
      msgs.pop();
      this.messages$.next(msgs);
    }
    this.retryCount = 0;
    this._stream(prompt, { appendUserMsg: false });
  }

  regenerateLastResponse(): void {
    const msgs = this.messages$.value;
    if (msgs.length < 2) return;

    let lastUserIdx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx < 0) return;

    const lastUserMsg = msgs[lastUserIdx].content;

    this.messages$.next(msgs.slice(0, lastUserIdx));

    this.sendMessage(lastUserMsg);
  }

  private _model: string | null = null;
  private _agentId: number | null = null;

  /** Called by the header when the model/agent selection changes: retains the
   *  selection for sends AND loads the capability matrix so the composer can
   *  warn about unsupported attachment/generation types. */
  setSelection(model: string | null, agentId: number | null): void {
    this._model = model ?? null;
    this._agentId = agentId ?? null;
    this.loadCapabilities(model);
  }

  loadCapabilities(model?: string | null): void {
    const q = model ? `?model=${encodeURIComponent(model)}` : '';
    this.http.get<{ capabilities: ModelCapabilities }>(
      `${environment.apiUrl}/v1/capabilities${q}`).subscribe({
        next: r => this.capabilities$.next(r.capabilities || null),
        error: () => this.capabilities$.next(null),
      });
  }

  /** Upload one file → returns an Attachment carrying the server fileId. */
  uploadAttachment(file: File): Promise<Attachment> {
    const form = new FormData();
    form.append('file', file);
    return firstValueFrom(this.http.post<any>(
      `${environment.apiUrl}/v1/files`, form)).then(r => ({
        fileId: r.fileId, kind: r.kind, mediaType: r.mediaType,
        fileName: r.fileName, size: r.size,
      }));
  }

  /** Absolute URL to a stored file's raw bytes (for <img>/<video> rendering). */
  mediaUrl(fileId: number, thumbnail = false): string {
    return `${environment.apiUrl}/v1/media/${fileId}${thumbnail ? '?thumbnail=true' : ''}`;
  }

  sendMessage(message: string, attachments?: Attachment[]): void {
    const trimmed = message.trim();
    const atts = (attachments || []).filter(a => a.fileId != null && !a.error);
    if (!trimmed && atts.length === 0) return;

    // B2 — if a reply is in flight, queue this message (text only for now;
    // attachments on queued messages are a later enhancement).
    if (this.isStreaming$.value) {
      if (trimmed) this.queuedMessages$.next([...this.queuedMessages$.value, trimmed]);
      return;
    }

    this.retryCount = 0;
    this._pendingAttachments = atts;
    // An image-only turn still needs a non-empty string (server min_length=1);
    // a single space is stripped server-side but satisfies the floor.
    this._stream(trimmed || ' ', { appendUserMsg: true });
  }

  /** Streaming worker. Reconnects automatically ONLY before any server-side
   *  effect (no content/tool yet) — retrying after tools ran could double-
   *  execute, so beyond that point the user gets a manual Retry (B8). */
  private _stream(text: string, opts: { appendUserMsg: boolean }): void {
    this.lastPrompt = text;
    this.currentPlan$.next([]);

    if (opts.appendUserMsg) {
      const userMsg: ChatMessage = { role: 'user', content: text };
      if (this._pendingAttachments.length) userMsg.attachments = this._pendingAttachments;
      this.messages$.next([...this.messages$.value, userMsg]);
    }

    const body: ChatRequest = {
      message: text,
      conversationId: this.activeConversationId$.value,
      stream: true,
      model: this._model,
      agentId: this._agentId
    };
    if (this._pendingAttachments.length) {
      body.attachmentIds = this._pendingAttachments
        .map(a => a.fileId!).filter(id => id != null);
    }
    // Consumed for this turn (a manual retry re-sends text only).
    this._pendingAttachments = [];

    this.isStreaming$.next(true);
    this.streamStatus$.next('connecting');
    this.activeTools$.next([]);

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const token = this.authService.GetToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-AG-Source': 'web',
      'X-Tenant-Domain': window.location.hostname,
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    // Tracks whether the server has begun doing work this attempt — gates
    // safe auto-reconnect.
    let producedEffect = false;

    fetch(`${this.apiBase}`, { method: 'POST', headers, body: JSON.stringify(body), signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let assistantContent = '';

        const assistantMsg: ChatMessage = { role: 'assistant', content: '', toolCalls: [] };
        this.messages$.next([...this.messages$.value, assistantMsg]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const t = line.trim();
            if (!t || !t.startsWith('data: ')) continue;
            const raw = t.substring(6);

            if (raw === '[DONE]') {
              this._finishStream();
              continue;
            }
            try {
              const event: SSEEvent = JSON.parse(raw);
              if (event.event === 'tool.start' || event.event === 'message.delta') {
                producedEffect = true;
              }
              this.sseEvent$.next(event);
              this.handleSSEEvent(event, assistantContent, (c) => { assistantContent = c; });
            } catch (_) { /* skip malformed */ }
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') {
          const msgs = [...this.messages$.value];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && !lastMsg.content) {
            lastMsg.content = '*(Generation stopped)*';
          }
          this.messages$.next([...msgs]);
          this._resetStreamState();
          return;
        }

        // Safe auto-reconnect: only before any server-side effect.
        if (!producedEffect && this.retryCount < this.MAX_AUTO_RETRIES) {
          this.retryCount++;
          const backoff = 500 * Math.pow(2, this.retryCount - 1);
          this.streamStatus$.next(`reconnecting (${this.retryCount})`);
          // Drop the empty assistant bubble from the failed attempt.
          const msgs = [...this.messages$.value];
          const last = msgs[msgs.length - 1];
          if (last && last.role === 'assistant' && !last.content) msgs.pop();
          this.messages$.next(msgs);
          this._resetStreamState();
          setTimeout(() => this._stream(text, { appendUserMsg: false }), backoff);
          return;
        }

        console.error('SSE stream error:', err);
        const msgs = [...this.messages$.value];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = lastMsg.content
            ? lastMsg.content + '\n\n⚠️ Connection lost.'
            : '⚠️ Connection lost.';
          lastMsg.isError = true;
          lastMsg.canRetry = true;
          this.messages$.next([...msgs]);
        }
        this._resetStreamState();
      });
  }

  private _finishStream(): void {
    this._resetStreamState();
    this.loadConversations();
    // B2 — flush the next queued message, if any.
    const q = this.queuedMessages$.value;
    if (q.length > 0) {
      const [next, ...rest] = q;
      this.queuedMessages$.next(rest);
      this.retryCount = 0;
      // small delay so the UI settles between turns
      setTimeout(() => this._stream(next, { appendUserMsg: true }), 60);
    }
  }

  private _resetStreamState(): void {
    this.isStreaming$.next(false);
    this.streamStatus$.next('');
    this.activeTools$.next([]);
    this.abortController = null;
  }

  private handleSSEEvent(
    event: SSEEvent,
    currentContent: string,
    updateContent: (content: string) => void
  ): void {
    switch (event.event) {
      case 'message.start':
        if (event.conversationId) {
          this.activeConversationId$.next(event.conversationId);
        }
        this.streamStatus$.next('started');
        break;

      case 'status':
        this.streamStatus$.next(event.state || '');
        break;

      case 'activity':
        this.streamStatus$.next(event.state || event.label || '');
        break;

      case 'tool.start': {
        this.streamStatus$.next(`Running: ${event.toolName || 'tool'}...`);
        const tools = [...this.activeTools$.value];
        const newTool = {
          name: event.toolName || 'tool',
          args: event.toolArgs,
          status: 'running' as const,
          startedAt: Date.now()
        };
        tools.push(newTool);
        this.activeTools$.next(tools);

        const msgs = [...this.messages$.value];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          if (!lastMsg.toolCalls) lastMsg.toolCalls = [];
          lastMsg.toolCalls.push({...newTool});
          this.messages$.next([...msgs]);
        }
        break;
      }

      case 'tool.end': {
        this.streamStatus$.next('');
        const tools = this.activeTools$.value.map(t => {
          if (t.name === event.toolName && t.status === 'running') {
            return { ...t, status: 'done' as const, duration: Date.now() - (t.startedAt || 0) };
          }
          return t;
        });
        this.activeTools$.next(tools);

        const msgs = [...this.messages$.value];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          if (!lastMsg.toolCalls) lastMsg.toolCalls = [];
          const existing = lastMsg.toolCalls.find(tc => tc.name === event.toolName && tc.status === 'running');
          if (existing) {
            existing.status = 'done';
          } else {

            lastMsg.toolCalls.push({ name: event.toolName || 'tool', args: event.toolArgs, status: 'done' });
          }
          this.messages$.next([...msgs]);
        }
        break;
      }

      case 'thinking.delta':
        if (event.content) {
          const msgs = [...this.messages$.value];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.thinking = (lastMsg.thinking || '') + event.content;
            this.streamStatus$.next('thinking');
            this.messages$.next([...msgs]);
          }
        }
        break;

      case 'message.delta':
        if (event.content) {
          const newContent = currentContent + event.content;
          updateContent(newContent);

          const msgs = [...this.messages$.value];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = newContent;

            if (lastMsg.thinking && !lastMsg.thinkingDone) {
              lastMsg.thinkingDone = true;
            }
            this.messages$.next([...msgs]);
          }
        }
        break;

      case 'message.end':
        this.streamStatus$.next('');
        if (event.content) {
          const msgs = [...this.messages$.value];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.content = event.content;
            this.messages$.next([...msgs]);
          }
        }

        if (event.conversationTokens != null || event.conversationCostUsd != null) {
          this.usage$.next({
            tokens: event.conversationTokens || 0,
            costUsd: event.conversationCostUsd || 0,
          });
        }
        break;

      case 'plan':

        if (event.steps && event.steps.length) {
          this.currentPlan$.next(event.steps);
        }
        break;

      case 'citations': {

        if (event.sources && event.sources.length) {
          const msgs = [...this.messages$.value];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            const existing = lastMsg.sources || [];
            const seen = new Set(existing.map(s => s.documentId || s.title));
            lastMsg.sources = [...existing,
              ...event.sources.filter(s => !seen.has(s.documentId || s.title))];
            this.messages$.next([...msgs]);
          }
        }
        break;
      }

      case 'approval.request': {

        if (event.approvalId) {
          const approvals = [...this.pendingApprovals$.value, {
            approvalId: event.approvalId,
            toolName: event.toolName || 'action',
            toolArgs: event.toolArgs,
            timeoutS: event.timeout_s || 300,
            requestedAt: Date.now(),
          }];
          this.pendingApprovals$.next(approvals);
          this.streamStatus$.next(`Awaiting approval: ${event.toolName || 'action'}`);
        }
        break;
      }

      case 'warning': {
        // Server-side "the selected model can't read X" — surface, keep going.
        if (event.message) this.warning$.next(event.message);
        break;
      }

      case 'artifact': {
        // Part 2 — the model generated media; attach it to the assistant bubble.
        if (event.fileId != null) {
          const msgs = [...this.messages$.value];
          const lastMsg = msgs[msgs.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            const att: Attachment = {
              fileId: event.fileId,
              kind: event.kind || 'image',
              mediaType: event.mediaType || 'image/png',
              fileName: 'generated',
            };
            lastMsg.attachments = [...(lastMsg.attachments || []), att];
            this.messages$.next([...msgs]);
          }
        }
        break;
      }

      case 'error': {
        this.streamStatus$.next('');
        this.isStreaming$.next(false);
        const msgs = [...this.messages$.value];
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg && lastMsg.role === 'assistant') {
          lastMsg.content = `⚠️ ${event.message || 'Something went wrong'}`;
          lastMsg.isError = true;
          lastMsg.canRetry = true;
          this.messages$.next([...msgs]);
        }
        break;
      }
    }
  }

  resolveApproval(approvalId: string, approved: boolean, reason = ''): void {

    this.pendingApprovals$.next(
      this.pendingApprovals$.value.filter(a => a.approvalId !== approvalId)
    );
    this.http.post(`${this.apiBase}/approvals/${approvalId}`, { approved, reason })
      .subscribe({
        next: () => {
          if (this.pendingApprovals$.value.length === 0) {
            this.streamStatus$.next('reasoning');
          }
        },
        error: (err) => console.error('Failed to resolve approval', err)
      });
  }
}
