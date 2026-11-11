import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  // The Agent API stores and serves the logo itself (standalone — no MSystem master).
  private base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  tenantLogoUrl(cacheBust = 0): string {
    const host = window.location.hostname;
    const bust = cacheBust ? `&_=${cacheBust}` : '';
    return `${this.base}/TenantLogo?domain=${host}${bust}`;
  }

  uploadLogo(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.base}/TenantLogo`, form);
  }
}
