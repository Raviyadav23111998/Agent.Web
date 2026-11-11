import { Component, EventEmitter, Output, HostListener } from '@angular/core';
import { Router } from '@angular/router';

interface SearchResult {
  label: string;
  icon: string;
  route: string;
  category: string;
}

@Component({
  selector: 'app-admin-search',
  template: `
    <div class="search-container" [class.active]="isOpen">
      <div class="search-trigger" (click)="open()">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="search-hint">Search admin...</span>
        <span class="search-shortcut">⌘K</span>
      </div>

      <div class="search-overlay" *ngIf="isOpen" (click)="close()">
        <div class="search-modal" (click)="$event.stopPropagation()">
          <div class="search-input-wrap">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input id="adminSearchInput" class="search-input" type="text"
                   placeholder="Search pages, settings, actions..."
                   autocomplete="off"
                   [value]="query"
                   (keyup)="onSearch($event)">
            <span class="search-esc" (click)="close()">ESC</span>
          </div>

          <div class="search-results" *ngIf="results.length > 0">
            <div class="search-category" *ngFor="let cat of categories">
              <div class="category-label">{{ cat }}</div>
              <button class="search-item" *ngFor="let r of resultsByCategory(cat)"
                      (click)="navigate(r)">
                <span class="item-icon">{{ r.icon }}</span>
                <span class="item-label">{{ r.label }}</span>
                <span class="item-arrow">→</span>
              </button>
            </div>
          </div>

          <div class="search-empty" *ngIf="query && results.length === 0">
            <span class="empty-icon">🔍</span>
            <span>No results for "{{ query }}"</span>
          </div>

          <div class="search-footer" *ngIf="!query">
            <span>Start typing to search admin pages and actions</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .search-trigger {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 14px;
      border: 1px solid var(--kendo-color-border);
      border-radius: 10px;
      background: var(--kendo-color-surface);
      cursor: pointer;
      transition: all 0.2s;
      min-width: 220px;

      &:hover {
        border-color: var(--kendo-color-primary-subtle);
        background: var(--kendo-color-app-surface);
      }
    }

    .search-hint {
      flex: 1;
      font-size: 0.82rem;
      color: var(--kendo-color-subtle);
    }

    .search-shortcut {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 4px;
      background: var(--kendo-color-base-subtle);
      color: var(--kendo-color-subtle);
      font-family: var(--kendo-font-family-monospace);
    }

    .search-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(4px);
      z-index: 1100;
      display: flex;
      justify-content: center;
      padding-top: 15vh;
      animation: fadeIn 0.15s ease;
    }

    .search-modal {
      background: var(--kendo-color-app-surface);
      border: 1px solid var(--kendo-color-border);
      border-radius: 16px;
      width: 560px;
      max-height: 440px;
      overflow: hidden;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.25);
      animation: slideDown 0.2s ease;
    }

    .search-input-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--kendo-color-border);
    }

    .search-input {
      flex: 1;
      border: none;
      background: transparent;
      font-size: 1rem;
      color: var(--kendo-color-on-app-surface);
      outline: none;
    }

    .search-esc {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--kendo-color-base-subtle);
      color: var(--kendo-color-subtle);
      cursor: pointer;
    }

    .search-results {
      max-height: 340px;
      overflow-y: auto;
      padding: 8px;
    }

    .category-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--kendo-color-subtle);
      padding: 8px 12px 4px;
    }

    .search-item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      background: transparent;
      border-radius: 8px;
      cursor: pointer;
      text-align: left;
      color: var(--kendo-color-on-app-surface);
      font-size: 0.88rem;
      transition: background 0.15s;

      &:hover {
        background: var(--kendo-color-base-subtle);
      }
    }

    .item-icon {
      font-size: 1rem;
      flex-shrink: 0;
    }

    .item-label {
      flex: 1;
    }

    .item-arrow {
      color: var(--kendo-color-subtle);
      font-size: 0.82rem;
    }

    .search-empty, .search-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 32px;
      color: var(--kendo-color-subtle);
      font-size: 0.85rem;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
  standalone: false
})
export class AdminSearchComponent {
  isOpen = false;
  query = '';
  results: SearchResult[] = [];

  private allItems: SearchResult[] = [
    { label: 'Dashboard', icon: '📊', route: '/admin/dashboard', category: 'Overview' },
    { label: 'Applications', icon: '📦', route: '/admin/applications', category: 'Platform' },
    { label: 'Bot Management', icon: '🤖', route: '/admin/bots', category: 'Platform' },
    { label: 'Agents', icon: '🧠', route: '/admin/agents', category: 'Platform' },
    { label: 'Cron Jobs', icon: '⏰', route: '/admin/crons', category: 'Platform' },
    { label: 'Knowledge Base', icon: '📚', route: '/admin/knowledge', category: 'Data & AI' },
    { label: 'Memory Browser', icon: '💾', route: '/admin/memory', category: 'Data & AI' },
    { label: 'LLM Configuration', icon: '⚡', route: '/admin/llm', category: 'Data & AI' },
    { label: 'Conversations', icon: '💬', route: '/admin/conversations', category: 'Data & AI' },
    { label: 'User Management', icon: '👥', route: '/admin/users', category: 'Security' },
    { label: 'Credential Vault', icon: '🔐', route: '/admin/credentials', category: 'Security' },
  ];

  constructor(private router: Router) {}

  @HostListener('document:keydown', ['$event'])
  handleKeydown(e: KeyboardEvent): void {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      this.isOpen ? this.close() : this.open();
    }
    if (e.key === 'Escape' && this.isOpen) {
      this.close();
    }
  }

  open(): void {
    this.isOpen = true;
    this.query = '';
    this.results = [];
    setTimeout(() => {
      const el = document.getElementById('adminSearchInput');
      if (el) el.focus();
    }, 100);
  }

  close(): void {
    this.isOpen = false;
    this.query = '';
    this.results = [];
  }

  onSearch(event: any): void {
    const rawQuery = event.target.value || '';
    this.query = rawQuery.trim();
    if (!this.query) {
      this.results = [];
      return;
    }
    const q = this.query.toLowerCase();
    this.results = this.allItems.filter(item =>
      item.label.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  }

  get categories(): string[] {
    return [...new Set(this.results.map(r => r.category))];
  }

  resultsByCategory(cat: string): SearchResult[] {
    return this.results.filter(r => r.category === cat);
  }

  navigate(item: SearchResult): void {
    this.close();
    this.router.navigate([item.route]);
  }
}
