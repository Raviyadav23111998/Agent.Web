import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import { CookieService } from 'ngx-cookie-service';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SharedDataService {

  docElement: HTMLElement;

  public isLoggedIn: boolean = false;
  public ShowLoader = new BehaviorSubject<boolean>(false);
  public dateFormat: string = 'dd-MM-yyyy';

  constructor(
    private cookieService: CookieService,
    private toastr: ToastrService,
    @Inject(DOCUMENT) private document: any
  ) {
    this.docElement = document.documentElement;
  }

  SetPrefferedLanguage(val: string) {
    this.cookieService.delete('PreferredLang');
    this.cookieService.set('PreferredLang', val?.toLowerCase() || 'en', 365, '/');
  }

  GetPrefferedLanguage(): string {
    return this.cookieService.get('PreferredLang') || 'en';
  }

  SetSession(sessionId: number) {
    this.cookieService.delete('SessionId');
    this.cookieService.set('SessionId', sessionId.toString(), 365, '/');
  }

  GetSessionID(): string {
    return this.cookieService.get('SessionId') || '0';
  }

  showSuccess(message: string, title?: string) {
    this.toastr.success(message, title);
  }

  showError(message: string, title?: string) {
    this.toastr.error(message, title);
  }

  showWarning(message: string, title?: string) {
    this.toastr.warning(message, title);
  }

  showInfo(message: string, title?: string) {
    this.toastr.info(message, title);
  }

  getURL(): string {
    return environment.apiUrl;
  }

  GetDateFormat(): string {
    return this.dateFormat;
  }

  formatForApi(dateInput: any): string {
    if (!dateInput) return '';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
      console.error('formatForApi received an invalid date:', dateInput);
      return '';
    }
    return d.toISOString();
  }
}
