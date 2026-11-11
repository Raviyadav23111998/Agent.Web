import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService, UserSession } from '../../services/auth.service';
import { TenantConfigService } from '../../services/tenant-config.service';
import { filter } from 'rxjs/operators';

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-admin-layout',
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss'],
  standalone: false
})
export class AdminLayoutComponent implements OnInit {
  sidebarCollapsed = false;
  mobileMenuOpen = false;
  activeRoute = '';
  activeSession: UserSession | null = null;
  pageTitle = 'Dashboard';

  navGroups: NavGroup[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: 'dashboard', route: '/admin/dashboard' }
      ]
    },
    {
      title: 'Platform',
      items: [
        { label: 'Applications', icon: 'package', route: '/admin/applications' },
        { label: 'Embed Integrations', icon: 'code', route: '/admin/integrations' },
        { label: 'Channels', icon: 'radio', route: '/admin/channels' },
        { label: 'Branding', icon: 'palette', route: '/admin/branding' },
        { label: 'Agents', icon: 'bot', route: '/admin/agents' },
        { label: 'Cron Jobs', icon: 'clock', route: '/admin/crons' }
      ]
    },
    {
      title: 'Data & AI',
      items: [
        { label: 'Knowledge Base', icon: 'book', route: '/admin/knowledge' },
        { label: 'Memory Browser', icon: 'database', route: '/admin/memory' },
        { label: 'LLM Configuration', icon: 'zap', route: '/admin/llm' },
        { label: 'Models & Budgets', icon: 'sliders', route: '/admin/llm-profiles' },
        { label: 'Skills & Learning', icon: 'graduation', route: '/admin/skills' },
        { label: 'Conversations', icon: 'message', route: '/admin/conversations' }
      ]
    },
    {
      title: 'Connections',
      items: [
        { label: 'Connections', icon: 'link', route: '/admin/connections' },
        { label: 'API Integrations', icon: 'puzzle', route: '/admin/api-integrations' }
      ]
    },
    {
      title: 'Security',
      items: [
        { label: 'User Management', icon: 'users', route: '/admin/users' },
        { label: 'Audit Log', icon: 'clipboard', route: '/admin/audit' }
      ]
    }
    // NOTE: the legacy "System Configuration" (global config) page was removed —
    // tenant-editable settings now live in Connections (credential vault) and the
    // LLM Configuration page; platform globals are deploy-time ENV. See
    // MULTITENANT_CONFIG_ARCHITECTURE.md.
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
    public tenantConfig: TenantConfigService
  ) {}

  ngOnInit(): void {
    this.activeSession = this.authService.getActiveSession();

    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.activeRoute = e.urlAfterRedirects || e.url;
        this.updatePageTitle();

        this.mobileMenuOpen = false;
      });

    this.activeRoute = this.router.url;
    this.updatePageTitle();

    if (window.innerWidth < 1200) {
      this.sidebarCollapsed = true;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }

  toggleSidebar(): void {
    if (window.innerWidth < 768) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
    this.mobileMenuOpen = false;
  }

  isActive(route: string): boolean {
    return this.activeRoute.startsWith(route);
  }

  goToChat(): void {
    this.router.navigate(['/chat']);
  }

  get initials(): string {
    if (!this.activeSession?.name) return '?';
    const parts = this.activeSession.name.split(' ');
    return parts.map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  get displayName(): string {
    return this.activeSession?.name || 'Admin';
  }

  private updatePageTitle(): void {
    for (const group of this.navGroups) {
      for (const item of group.items) {
        if (this.isActive(item.route)) {
          this.pageTitle = item.label;
          return;
        }
      }
    }
    this.pageTitle = 'Admin';
  }
}
