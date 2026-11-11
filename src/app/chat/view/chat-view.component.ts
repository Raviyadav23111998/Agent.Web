import {
  Component, OnInit, OnDestroy, ViewChild,
  ElementRef, AfterViewChecked, NgZone
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService, ChatMessage, ToolExecution, PendingApproval } from '../services/chat.service';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';

@Component({
  standalone: false,
  selector: 'app-chat-view',
  templateUrl: './chat-view.component.html',
  styleUrls: ['./chat-view.component.scss']
})
export class ChatViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('messageContainer') messageContainer!: ElementRef;

  messages: ChatMessage[] = [];
  isStreaming = false;
  streamStatus = '';
  showScrollButton = false;
  activeTools: ToolExecution[] = [];
  pendingApprovals: PendingApproval[] = [];
  planSteps: string[] = [];
  planExpanded = true;
  queuedCount = 0;
  private shouldAutoScroll = true;
  private subs = new Subscription();

  suggestions = [
    { icon: '📧', text: 'Summarize my last 10 emails' },
    { icon: '📋', text: 'Show my open Jira tickets' },
    { icon: '💻', text: 'Write a Python script to parse CSV files' },
    { icon: '🧠', text: 'What do you know about me?' },
  ];

  constructor(
    public chatService: ChatService,
    private route: ActivatedRoute,
    private ngZone: NgZone,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {

    // Server-side capability warnings ("selected model can't read X").
    this.subs.add(
      this.chatService.warning$.subscribe(msg => this.toastr.warning(msg))
    );

    this.subs.add(
      this.route.params.subscribe(params => {
        const convId = params['conversationId'];
        if (convId) {
          this.chatService.loadConversation(convId);
        }
      })
    );

    this.subs.add(
      this.chatService.messages$.subscribe(msgs => {
        this.messages = msgs;
        this.shouldAutoScroll = true;
      })
    );

    this.subs.add(
      this.chatService.isStreaming$.subscribe(s => this.isStreaming = s)
    );

    this.subs.add(
      this.chatService.streamStatus$.subscribe(s => this.streamStatus = s)
    );

    this.subs.add(
      this.chatService.activeTools$.subscribe(tools => this.activeTools = tools)
    );

    this.subs.add(
      this.chatService.currentPlan$.subscribe(steps => {
        this.planSteps = steps;
        if (steps.length) { this.planExpanded = true; this.shouldAutoScroll = true; }
      })
    );

    this.subs.add(
      this.chatService.pendingApprovals$.subscribe(a => {
        this.pendingApprovals = a;
        this.shouldAutoScroll = true;
      })
    );

    this.subs.add(
      this.chatService.queuedMessages$.subscribe(q => this.queuedCount = q.length)
    );
  }

  onRetry(): void {
    this.chatService.retryLast();
  }

  onApproval(approvalId: string, approved: boolean): void {
    this.chatService.resolveApproval(approvalId, approved);
  }

  ngAfterViewChecked(): void {
    if (this.shouldAutoScroll) {
      this.scrollToBottom();
      this.shouldAutoScroll = false;
    }
  }

  get hasAssistantContent(): boolean {
    if (this.messages.length === 0) return false;
    const last = this.messages[this.messages.length - 1];
    return last.role === 'assistant' && !!last.content;
  }

  onSendMessage(payload: { text: string; attachments: any[] }): void {
    this.chatService.sendMessage(payload.text, payload.attachments);
  }

  useSuggestion(text: string): void {
    this.chatService.sendMessage(text);
  }

  onStopGeneration(): void {
    this.chatService.stopGeneration();
  }

  onRegenerate(): void {
    this.chatService.regenerateLastResponse();
  }

  onScroll(): void {
    const el = this.messageContainer?.nativeElement;
    if (el) {
      const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      this.showScrollButton = distFromBottom > 100;
    }
  }

  scrollToBottom(): void {
    const el = this.messageContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
      this.showScrollButton = false;
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
