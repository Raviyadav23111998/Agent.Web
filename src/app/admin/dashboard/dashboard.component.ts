import { Component, OnInit, OnDestroy } from '@angular/core';
import { AdminService, DashboardStats, HealthResponse } from '../../chat/services/admin.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: false
})
export class DashboardComponent implements OnInit, OnDestroy {
  private refreshSub?: Subscription;

  loading = true;
  stats: DashboardStats | null = null;
  health: HealthResponse | null = null;
  lastRefresh: Date | null = null;
  autoRefresh = true;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.loadAll();
    this.refreshSub = interval(30000).subscribe(() => {
      if (this.autoRefresh) this.loadAll();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadAll(): void {
    this.loadStats();
    this.loadHealth();
    this.lastRefresh = new Date();
  }

  loadStats(): void {
    this.adminService.getDashboardStats().subscribe({
      next: (data) => { this.stats = data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  loadHealth(): void {
    this.adminService.getHealth().subscribe({
      next: (data) => this.health = data,
      error: () => {}
    });
  }

  get uptimeFormatted(): string {
    if (!this.health?.uptime_seconds) return '—';
    const s = this.health.uptime_seconds;
    const days = Math.floor(s / 86400);
    const hours = Math.floor((s % 86400) / 3600);
    const mins = Math.floor((s % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  get healthStatusClass(): string {
    if (!this.health) return 'status-unknown';
    return this.health.status === 'healthy' ? 'status-healthy' : 'status-degraded';
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'executed': return '✅';
      case 'denied': return '🚫';
      case 'blocked': return '🔒';
      case 'error': return '❌';
      default: return '⚪';
    }
  }

  getSideEffectBadge(effect: string): string {
    switch (effect) {
      case 'irreversible': return 'badge-danger';
      case 'write': return 'badge-warning';
      case 'read': return 'badge-info';
      default: return 'badge-default';
    }
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
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
