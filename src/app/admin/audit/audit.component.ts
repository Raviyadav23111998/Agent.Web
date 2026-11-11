import { Component, OnInit } from '@angular/core';
import { AdminService, AuditEntry, AuditSummary } from '../../chat/services/admin.service';

@Component({
  selector: 'app-audit',
  templateUrl: './audit.component.html',
  styleUrls: ['./audit.component.scss'],
  standalone: false,
})
export class AuditComponent implements OnInit {
  entries: AuditEntry[] = [];
  summary: AuditSummary | null = null;

  total = 0;
  skip = 0;
  take = 50;

  loading = false;
  loadError = false;

  // filters
  fTool = '';
  fStatus = '';
  fSideEffect = '';

  readonly statuses = ['', 'executed', 'blocked', 'denied', 'timeout', 'error'];
  readonly sideEffects = ['', 'read', 'write', 'irreversible'];

  constructor(private admin: AdminService) {}

  ngOnInit(): void {
    this.loadSummary();
    this.load();
  }

  loadSummary(): void {
    this.admin.getAuditSummary().subscribe({
      next: (s) => this.summary = s,
      error: () => { /* summary is best-effort */ },
    });
  }

  load(): void {
    this.loading = true;
    this.loadError = false;
    this.admin.listAudit({
      toolName: this.fTool || undefined,
      status: this.fStatus || undefined,
      sideEffect: this.fSideEffect || undefined,
      skip: this.skip,
      take: this.take,
    }).subscribe({
      next: (res) => {
        this.entries = res.items || [];
        this.total = res.total || 0;
        this.loading = false;
      },
      error: () => { this.loading = false; this.loadError = true; },
    });
  }

  applyFilters(): void {
    this.skip = 0;
    this.load();
  }

  clearFilters(): void {
    this.fTool = ''; this.fStatus = ''; this.fSideEffect = '';
    this.skip = 0;
    this.load();
  }

  get hasFilters(): boolean {
    return !!(this.fTool || this.fStatus || this.fSideEffect);
  }

  get page(): number { return Math.floor(this.skip / this.take) + 1; }
  get pageCount(): number { return Math.max(1, Math.ceil(this.total / this.take)); }

  prev(): void {
    if (this.skip <= 0) return;
    this.skip = Math.max(0, this.skip - this.take);
    this.load();
  }

  next(): void {
    if (this.skip + this.take >= this.total) return;
    this.skip += this.take;
    this.load();
  }

  statusClass(status: string): string {
    switch ((status || '').toLowerCase()) {
      case 'executed': return 'ok';
      case 'blocked':
      case 'denied': return 'warn';
      case 'error':
      case 'timeout': return 'err';
      default: return '';
    }
  }
}
