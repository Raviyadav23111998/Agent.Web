import { Component, EventEmitter, OnInit, OnDestroy, Output } from '@angular/core';
import { Router } from '@angular/router';
import { ChatService, Conversation } from '../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { TenantConfigService } from '../../services/tenant-config.service';
import { ConfirmService } from '../../common/ui/confirm.service';
import { Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-chat-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  @Output() newChatClicked = new EventEmitter<void>();
  @Output() sidebarClose = new EventEmitter<void>();

  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  activeConversationId: string | null = null;
  searchQuery = '';

  todayConvs: Conversation[] = [];
  yesterdayConvs: Conversation[] = [];
  weekConvs: Conversation[] = [];
  olderConvs: Conversation[] = [];

  userName = '';
  userEmail = '';

  private subs = new Subscription();

  constructor(
    public chatService: ChatService,
    private authService: AuthService,
    public tenantConfig: TenantConfigService,
    private router: Router,
    private confirm: ConfirmService
  ) {}

  ngOnInit(): void {
    const session = this.authService.getActiveSession();
    if (session) {
      this.userName = session.name || 'User';
    }

    this.subs.add(
      this.chatService.conversations$.subscribe(convs => {
        this.conversations = convs;
        this.applyFilter();
      })
    );

    this.subs.add(
      this.chatService.activeConversationId$.subscribe(id => {
        this.activeConversationId = id;
      })
    );
  }

  newChat(): void {
    this.chatService.newChat();
    this.newChatClicked.emit();
    this.router.navigate(['/chat']);
    if (window.innerWidth < 768) {
      this.sidebarClose.emit();
    }
  }

  selectConversation(conv: Conversation): void {
    if (this.activeConversationId !== conv.conversationId) {
      this.chatService.loadConversation(conv.conversationId);
    }
    this.router.navigate(['/chat', conv.conversationId]);

    if (window.innerWidth < 768) {
      this.sidebarClose.emit();
    }
  }

  async deleteConversation(event: Event, conv: Conversation): Promise<void> {
    event.stopPropagation();
    const ok = await this.confirm.ask({
      title: 'Delete conversation?',
      message: `"${conv.title || 'New conversation'}" will be permanently removed.`,
      variant: 'danger',
      confirmText: 'Delete',
    });
    if (ok) {
      this.chatService.deleteConversation(conv.conversationId);
    }
  }

  onSearchChange(): void {
    this.applyFilter();
  }

  logout(): void {
    this.authService.logout();
  }

  private applyFilter(): void {
    let convs = this.conversations;
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      convs = convs.filter(c =>
        (c.title || '').toLowerCase().includes(q)
      );
    }
    this.filteredConversations = convs;
    this.groupByDate(convs);
  }

  private groupByDate(convs: Conversation[]): void {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 86400000);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);

    this.todayConvs = [];
    this.yesterdayConvs = [];
    this.weekConvs = [];
    this.olderConvs = [];

    for (const c of convs) {
      const d = new Date(c.updatedAt || c.createdAt);
      if (d >= todayStart) {
        this.todayConvs.push(c);
      } else if (d >= yesterdayStart) {
        this.yesterdayConvs.push(c);
      } else if (d >= weekStart) {
        this.weekConvs.push(c);
      } else {
        this.olderConvs.push(c);
      }
    }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }
}
