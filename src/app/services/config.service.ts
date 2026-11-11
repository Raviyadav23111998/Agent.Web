import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JiraConfig {
  serverUrl?: string;
  email?: string;
  apiToken?: string;
}

export interface SmtpConfig {
  server?: string;
  port?: number;
  username?: string;
  password?: string;
  useTls?: boolean;
}

export interface M365Config {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  userEmail?: string;
}

export interface IntegrationsResponse {
  jira?: JiraConfig;
  smtp?: SmtpConfig;
  m365?: M365Config;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private apiUrl = `${environment.apiUrl}/v1/config/integrations`;

  constructor(private http: HttpClient) {}

  getIntegrations(): Observable<IntegrationsResponse> {
    return this.http.get<IntegrationsResponse>(this.apiUrl);
  }

  updateJira(config: JiraConfig): Observable<any> {
    return this.http.post(`${this.apiUrl}/jira`, config);
  }

  updateSmtp(config: SmtpConfig): Observable<any> {
    return this.http.post(`${this.apiUrl}/smtp`, config);
  }

  updateM365(config: M365Config): Observable<any> {
    return this.http.post(`${this.apiUrl}/m365`, config);
  }
}
