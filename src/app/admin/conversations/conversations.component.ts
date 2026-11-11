import { Component, OnInit } from '@angular/core';
import { AdminService, AdminConversation, AdminConversationDetail } from '../../chat/services/admin.service';
import { ToastrService } from 'ngx-toastr';
import { ConfirmService } from '../../common/ui/confirm.service';

@Component({
  selector: 'app-conversations',
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.scss'],
  standalone: false
})
export class ConversationsComponent implements OnInit {
  conversations: AdminConversation[] = [];
  total = 0;
  skip = 0;
  take = 30;
  isLoading = true;

  searchQuery = '';
  filterSource = '';
  filterUserId: number | null = null;

  selectedConversation: AdminConversationDetail | null = null;
  isDetailLoading = false;

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService,
    private confirm: ConfirmService
  ) {}

  ngOnInit(): void {
    this.loadConversations();
  }

  loadConversations(): void {
    this.isLoading = true;
    this.adminService.listConversations({
      search: this.searchQuery || undefined,
      source: this.filterSource || undefined,
      userId: this.filterUserId || undefined,
      skip: this.skip,
      take: this.take,
    }).subscribe({
      next: (res) => {
        this.conversations = res.items;
        this.total = res.total;
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load conversations');
        this.isLoading = false;
      }
    });
  }

  onSearch(): void {
    this.skip = 0;
    this.loadConversations();
  }

  onFilterChange(): void {
    this.skip = 0;
    this.loadConversations();
  }

  nextPage(): void {
    if (this.skip + this.take < this.total) {
      this.skip += this.take;
      this.loadConversations();
    }
  }

  prevPage(): void {
    if (this.skip > 0) {
      this.skip = Math.max(0, this.skip - this.take);
      this.loadConversations();
    }
  }

  get currentPage(): number {
    return Math.floor(this.skip / this.take) + 1;
  }

  get totalPages(): number {
    return Math.ceil(this.total / this.take);
  }

  openDetail(conv: AdminConversation): void {
    this.isDetailLoading = true;
    this.selectedConversation = null;
    this.adminService.getConversation(conv.conversationId).subscribe({
      next: (detail) => {
        this.selectedConversation = detail;
        this.isDetailLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load conversation');
        this.isDetailLoading = false;
      }
    });
  }

  closeDetail(): void {
    this.selectedConversation = null;
  }

  async deleteConversation(conv: AdminConversation, event: Event): Promise<void> {
    event.stopPropagation();
    const ok = await this.confirm.ask({
      title: 'Delete conversation?',
      message: `“${conv.title || conv.conversationId}” and its messages will be permanently removed.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (!ok) return;
    this.adminService.deleteConversation(conv.conversationId).subscribe({
      next: () => {
        this.toastr.success('Conversation deleted');
        this.loadConversations();
      },
      error: () => this.toastr.error('Failed to delete')
    });
  }

  getSourceIcon(source: string): string {
    const icons: Record<string, string> = {
      web: '🌐', cli: '⌨️', api: '🔌', bot: '🤖', cron: '⏰'
    };
    return icons[source] || '💬';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '—';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
