import { Injectable, Inject } from '@angular/core';
import { MSAL_GUARD_CONFIG, MsalGuardConfiguration, MsalService, MsalBroadcastService } from '@azure/msal-angular';
import { RedirectRequest } from '@azure/msal-browser';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class MSALService {
  private readonly _destroying$ = new Subject<void>();

  constructor(
    @Inject(MSAL_GUARD_CONFIG) private msalGuardConfig: MsalGuardConfiguration,
    private authService: MsalService,
    private msalBroadcastService: MsalBroadcastService
  ) {}

  async login() {
    if (this.msalGuardConfig.authRequest) {
      this.authService.loginRedirect({ ...this.msalGuardConfig.authRequest } as RedirectRequest);
    } else {
      this.authService.loginRedirect();
    }
  }

  async handleRedirect() {
    return new Promise((resolve) => {
      this.authService.handleRedirectObservable().subscribe({
        next: (result) => {
          if (result) {
            resolve(result.accessToken);
          } else {
            resolve(null);
          }
        },
        error: (error) => {
          console.error(error);
          resolve(null);
        }
      });
    });
  }

  logout() {
    this.authService.logoutRedirect();
  }
}
