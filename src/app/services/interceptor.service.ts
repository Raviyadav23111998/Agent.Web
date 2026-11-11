import {
  HttpErrorResponse, HttpEvent, HttpHandler, HttpHeaders,
  HttpInterceptor, HttpRequest, HttpResponse
} from '@angular/common/http';
import { Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { Observable, Subject, throwError } from 'rxjs';
import { catchError, filter, switchMap, take, tap } from 'rxjs/operators';
import { SharedDataService } from './shared-data.service';
import { AuthService, LoginResponseModel } from './auth.service';
import { Router } from '@angular/router';

@Injectable()
export class InterceptorService implements HttpInterceptor {
  private refreshingAccessToken: boolean = false;
  private accessTokenRefreshSubject: Subject<any> = new Subject<any>();

  private readonly SKIP_AUTH_PATHS = ['/Login', '/ChangePassword'];

  constructor(
    private cookieService: CookieService,
    private sharedDataService: SharedDataService,
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if (!this.shouldSkipAuth(req)) {

      setTimeout(() => this.sharedDataService.ShowLoader.next(true), 0);

      const token = this.authService.GetToken();

      return next.handle(req.clone({ headers: this.GetHeader(token, req) })).pipe(
        catchError((error: HttpErrorResponse) => {
          setTimeout(() => this.sharedDataService.ShowLoader.next(false), 0);

          if (error.status === 401) {
            return this.HandleExpiredToken(req, next);
          } else {

            const body: any = error.error || {};
            let msg = body.detail || body.message ||
              (error.status === 0 ? 'Cannot reach the server — check your connection.'
                                  : `Request failed (${error.status})`);
            if (typeof msg !== 'string') msg = `Request failed (${error.status})`;
            this.sharedDataService.showError(msg);
          }
          return throwError(() => error);
        }),
        tap((event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
            this.sharedDataService.ShowLoader.next(false);
          }
        })
      );
    } else {
      return next.handle(req.clone({ headers: this.GetPublicHeader() }));
    }
  }

  shouldSkipAuth(req: HttpRequest<any>): boolean {
    const url = req.url;

    if (url.includes('/assets/') || url.includes('./assets/')) {
      return true;
    }

    for (const path of this.SKIP_AUTH_PATHS) {
      if (url.endsWith(path)) {
        return true;
      }
    }

    return false;
  }

  HandleExpiredToken(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.refreshingAccessToken) {
      this.refreshingAccessToken = true;
      this.accessTokenRefreshSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((res: LoginResponseModel) => {
          this.refreshingAccessToken = false;

          this.authService.saveLoginResponse(res);
          this.accessTokenRefreshSubject.next(res.accessToken);

          return next.handle(request.clone({ headers: this.GetHeader(res.accessToken, request) }));
        }),
        catchError((error) => {
          this.sharedDataService.ShowLoader.next(false);
          this.refreshingAccessToken = false;

          if (error.status === 401) {
            this.sharedDataService.showError('Session Expired');
            this.authService.logout();
          } else {
            this.sharedDataService.showError('Internal Server Error');
          }
          return throwError(() => error);
        })
      );
    }

    return this.accessTokenRefreshSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap((token) => {
        return next.handle(request.clone({ headers: this.GetHeader(token, request) }));
      })
    );
  }

  GetHeader(token: string | null, request: HttpRequest<any>) {
    const lang = this.cookieService.get('PreferredLang') || 'en';
    const sessionId = this.cookieService.get('SessionId') || '';

    let headersConfig: any = {
      'Language': lang,
      'SessionId': sessionId,
      'Agent': 'Web',
      'X-AG-Source': 'web',

      'X-Tenant-Domain': window.location.hostname
    };

    if (token) {
      headersConfig['Authorization'] = 'Bearer ' + token;
    }

    return new HttpHeaders(headersConfig);
  }

  GetPublicHeader() {
    return new HttpHeaders({
      'Language': this.cookieService.get('PreferredLang') || 'en',
      'SessionId': this.cookieService.get('SessionId') || '',
      'Agent': 'Web',
      'X-AG-Source': 'web',
      'TimeZone': Intl.DateTimeFormat().resolvedOptions().timeZone,
      'X-Tenant-Domain': window.location.hostname
    });
  }
}
