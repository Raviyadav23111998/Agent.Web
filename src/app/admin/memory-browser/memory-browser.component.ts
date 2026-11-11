import { Component, OnInit } from '@angular/core';
import { AdminService } from '../../chat/services/admin.service';
import { ToastrService } from 'ngx-toastr';
import { ConfirmService } from '../../common/ui/confirm.service';

@Component({
  selector: 'app-memory-browser',
  templateUrl: './memory-browser.component.html',
  styleUrls: ['./memory-browser.component.scss'],
  standalone: false
})
export class MemoryBrowserComponent implements OnInit {
  memories: any[] = [];
  filteredMemories: any[] = [];
  stats: any = null;
  isLoading = true;
  searchQuery = '';
  selectedCategory = '';
  selectedLayer = '';

  categories = ['fact', 'preference', 'instruction', 'context', 'skill', 'entity'];
  layers = ['semantic', 'episodic', 'session', 'company'];

  constructor(
    private adminService: AdminService,
    private toastr: ToastrService,
    private confirm: ConfirmService
  ) {}

  ngOnInit(): void {
    this.loadMemories();
    this.loadStats();
  }

  loadMemories(): void {
    this.isLoading = true;
    this.adminService.listMemories(this.selectedCategory || undefined).subscribe({
      next: (memories) => {
        this.memories = memories;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.toastr.error('Failed to load memories');
        this.isLoading = false;
      }
    });
  }

  loadStats(): void {
    this.adminService.getMemoryStats().subscribe({
      next: (stats) => this.stats = stats,
      error: () => {}
    });
  }

  applyFilters(): void {
    let result = [...this.memories];
    if (this.selectedLayer) {
      result = result.filter(m => m.layer === this.selectedLayer);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(m =>
        (m.key || '').toLowerCase().includes(q) ||
        (m.value || '').toLowerCase().includes(q)
      );
    }
    this.filteredMemories = result;
  }

  onFilterChange(): void {
    if (this.selectedCategory !== '') {
      this.loadMemories();
    } else {
      this.applyFilters();
    }
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  async deleteMemory(memory: any, event: Event): Promise<void> {
    event.stopPropagation();
    const id = memory.memoryId || memory.memory_id;
    const ok = await this.confirm.ask({
      title: 'Delete memory?',
      message: `“${memory.key}” will be permanently removed.`,
      confirmText: 'Delete', variant: 'danger',
    });
    if (!ok) return;
    this.adminService.deleteMemory(id).subscribe({
      next: () => {
        this.toastr.success('Memory deleted');
        this.memories = this.memories.filter(m => (m.memoryId || m.memory_id) !== id);
        this.applyFilters();
      },
      error: () => this.toastr.error('Failed to delete')
    });
  }

  getCategoryIcon(cat: string): string {
    const icons: Record<string, string> = {
      fact: '📋', preference: '⭐', instruction: '📌',
      context: '🔗', skill: '🛠️', entity: '👤'
    };
    return icons[cat] || '💾';
  }

  getLayerColor(layer: string): string {
    const colors: Record<string, string> = {
      semantic: 'layer-semantic', episodic: 'layer-episodic',
      session: 'layer-session', company: 'layer-company'
    };
    return colors[layer] || '';
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
