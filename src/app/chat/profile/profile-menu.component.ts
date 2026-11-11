import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, UserSession } from '../../services/auth.service';

@Component({
  standalone: false,
  selector: 'app-profile-menu',
  templateUrl: './profile-menu.component.html',
  styleUrls: ['./profile-menu.component.scss']
})
export class ProfileMenuComponent implements OnInit {
  @Output() closed = new EventEmitter<void>();

  activeSession: UserSession | null = null;
  accounts: UserSession[] = [];
  isOpen = false;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.activeSession = this.authService.getActiveSession();
    this.accounts = this.authService.getAvailableAccounts();
  }

  get initials(): string {
    if (!this.activeSession?.name) return '?';
    const parts = this.activeSession.name.split(' ');
    return parts.map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');
  }

  get displayName(): string {
    return this.activeSession?.name || 'User';
  }

  get roleName(): string {
    return this.activeSession?.role || '';
  }

  get isAdmin(): boolean {
    const role = (this.activeSession?.role || '').toLowerCase();
    return ['admin', 'superadmin', 'administrator', 'owner', 'tenant owner'].includes(role);
  }

  toggle(): void {
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
    this.closed.emit();
  }

  goToAdmin(event: Event): void {
    event.preventDefault();
    this.close();
    this.router.navigate(['/admin']);
  }

  switchAccount(account: UserSession): void {
    this.authService.setActiveUser(account.userId);
    window.location.reload();
  }

  logout(): void {
    this.authService.logout();
  }
}
