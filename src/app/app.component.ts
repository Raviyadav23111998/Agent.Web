import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SharedDataService } from './services/shared-data.service';
import { AuthService } from './services/auth.service';
import { ThemeService } from './services/theme.service';
import { TenantConfigService } from './services/tenant-config.service';
import { CopilotEngineService } from './copilot/copilot-engine.service';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'Agent Platform';

  constructor(
    public sharedDataService: SharedDataService,
    public authService: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private tenantConfig: TenantConfigService,
    private copilot: CopilotEngineService
  ) {}

  async ngOnInit(): Promise<void> {

    await this.tenantConfig.loadConfig();

    this.sharedDataService.isLoggedIn = this.authService.isAuthenticated();

    this.copilot.exposeForDebug();

    this.checkAndHandleUrlSwitch();
  }

  private checkAndHandleUrlSwitch() {
    const params = new URLSearchParams(window.location.search);
    const targetUserId = params.get('switchUser');

    if (targetUserId) {
      const currentUser = this.authService.getActiveSession();
      const availableAccounts = this.authService.getAvailableAccounts();
      const targetAccountExists = availableAccounts.find(u => u.userId === targetUserId);

      if (targetAccountExists) {
        if (currentUser?.userId !== targetUserId) {
          this.authService.setActiveUser(targetUserId);
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
          window.location.reload();
        } else {
          const newUrl = window.location.pathname + window.location.hash;
          window.history.replaceState({}, document.title, newUrl);
        }
      }
    }
  }
}
