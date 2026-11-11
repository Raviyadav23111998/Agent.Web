import {
  Component, EventEmitter, Input, Output, ViewChild, ElementRef,
  OnInit, OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatService, Attachment, ModelCapabilities } from '../services/chat.service';

@Component({
  standalone: false,
  selector: 'app-chat-input',
  templateUrl: './chat-input.component.html',
  styleUrls: ['./chat-input.component.scss']
})
export class ChatInputComponent implements OnInit, OnDestroy {
  @ViewChild('chatTextarea') chatTextarea!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  @Output() messageSent = new EventEmitter<{ text: string; attachments: Attachment[] }>();
  @Output() stopGeneration = new EventEmitter<void>();

  /** True while a reply is streaming. The composer STAYS usable (B2). */
  @Input() isStreaming = false;
  @Input() queuedCount = 0;
  @Input() placeholder = 'Message…';

  inputText = '';
  isFocused = false;
  isDragOver = false;

  attachments: Attachment[] = [];
  capabilities: ModelCapabilities | null = null;
  warning = '';

  private subs = new Subscription();

  constructor(private chatService: ChatService) {}

  ngOnInit(): void {
    this.subs.add(this.chatService.capabilities$.subscribe(c => {
      this.capabilities = c;
      this.revalidate();
    }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.attachments.forEach(a => a.localUrl && URL.revokeObjectURL(a.localUrl));
  }

  get uploading(): boolean { return this.attachments.some(a => a.uploading); }
  get canSend(): boolean {
    const hasValid = this.attachments.some(a => a.fileId != null && !a.error);
    return (!!this.inputText.trim() || hasValid) && !this.uploading;
  }

  // ── attach ────────────────────────────────────────────────────────────
  openFilePicker(): void { this.fileInput?.nativeElement?.click(); }

  onFilesSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    if (input.files) this.addFiles(Array.from(input.files));
    input.value = '';
  }

  onPaste(ev: ClipboardEvent): void {
    const files = Array.from(ev.clipboardData?.files || []);
    if (files.length) { ev.preventDefault(); this.addFiles(files); }
  }

  onDragOver(ev: DragEvent): void { ev.preventDefault(); this.isDragOver = true; }
  onDragLeave(): void { this.isDragOver = false; }
  onDrop(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragOver = false;
    const files = Array.from(ev.dataTransfer?.files || []);
    if (files.length) this.addFiles(files);
  }

  private kindOf(mt: string): string {
    if (mt.startsWith('image/')) return 'image';
    if (mt === 'application/pdf') return 'document';
    if (mt.startsWith('audio/')) return 'audio';
    if (mt.startsWith('video/')) return 'video';
    return 'document';
  }

  private addFiles(files: File[]): void {
    for (const file of files) {
      const kind = this.kindOf(file.type || '');
      const att: Attachment = {
        kind, mediaType: file.type || 'application/octet-stream',
        fileName: file.name, size: file.size, uploading: true,
      };
      if (kind === 'image') att.localUrl = URL.createObjectURL(file);
      this.attachments = [...this.attachments, att];
      this.chatService.uploadAttachment(file)
        .then(res => { att.fileId = res.fileId; att.uploading = false; })
        .catch((err) => {
          att.uploading = false;
          att.error = true;
          const msg = err?.error?.detail || `Couldn't upload ${file.name}.`;
          this.chatService.warning$.next(msg);
        });
    }
    this.revalidate();
  }

  removeAttachment(att: Attachment): void {
    if (att.localUrl) URL.revokeObjectURL(att.localUrl);
    this.attachments = this.attachments.filter(a => a !== att);
    this.revalidate();
  }

  /** Warn (never block) when an attached type isn't supported by the selected
   *  native model — mirrors the server-side guard. */
  private revalidate(): void {
    const caps = this.capabilities;
    if (!caps || this.attachments.length === 0) { this.warning = ''; return; }
    const keymap: Record<string, keyof ModelCapabilities['input']> = {
      image: 'image', document: 'pdf', audio: 'audio', video: 'video',
    };
    const unsupported = new Set<string>();
    for (const a of this.attachments) {
      const key = keymap[a.kind] || 'image';
      if (!caps.input[key]) unsupported.add(a.kind);
    }
    this.warning = unsupported.size
      ? `The selected model can't read ${[...unsupported].join(', ')} attachment(s). `
        + `Pick a model that supports them, or remove them.`
      : '';
  }

  // ── send ──────────────────────────────────────────────────────────────
  send(): void {
    const text = this.inputText.trim();
    const atts = this.attachments.filter(a => a.fileId != null && !a.error);
    if ((!text && atts.length === 0) || this.uploading) return;
    this.messageSent.emit({ text, attachments: atts });
    this.inputText = '';
    // Do NOT revoke localUrls here: the emitted attachments are now owned by the
    // sent message and rendered from those same object URLs (revoking would break
    // the just-sent image). They're released on conversation reload (server bytes
    // take over) or component destroy.
    this.attachments = [];
    this.warning = '';
    this.resetHeight();
  }

  onStop(): void { this.stopGeneration.emit(); }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.send();
    }
  }

  onInput(): void {
    const ta = this.chatTextarea?.nativeElement;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
    }
  }

  focus(): void { this.chatTextarea?.nativeElement?.focus(); }

  private resetHeight(): void {
    const ta = this.chatTextarea?.nativeElement;
    if (ta) ta.style.height = 'auto';
  }
}
