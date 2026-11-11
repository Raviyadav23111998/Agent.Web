import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  private masterBase = environment.apiUrl.replace('/api/agent', '/api/master');

  constructor(private http: HttpClient) {}

  tenantLogoUrl(cacheBust = 0): string {
    const host = window.location.hostname;
    const bust = cacheBust ? `&_=${cacheBust}` : '';
    return `${this.masterBase}/tenant-config/TenantLogo?domain=${host}${bust}`;
  }

  uploadLogo(file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.masterBase}/tenant-config/TenantLogo`, form);
  }
}
