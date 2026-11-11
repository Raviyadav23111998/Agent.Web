import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CookieService } from 'ngx-cookie-service';

@Injectable({
  providedIn: 'root'
})
export class LanguageDataService {

  constructor(private http: HttpClient, private cookieService: CookieService) { }

  getLangCode(): string {
    const prefLang = this.cookieService.get('PreferredLang');
    return prefLang ? prefLang : 'en';
  }

  getLoginLanguage() {
    return this.http.get(`language/${this.getLangCode()}/login.json`);
  }

  getMessageLanguage() {
    return this.http.get(`language/${this.getLangCode()}/message.json`);
  }
}
