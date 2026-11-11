import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmbedIntegration {
  integration_id: number;
  name: string;
  mode: 'chat' | 'copilot';
  publishable_key: string;
  allowed_domains: string[];
  app_id?: number;
  persona_id?: number;
  is_active: boolean;
  has_secret: boolean;
  created_at: string;
}

export interface IntegrationCreateRequest {
  name: string;
  mode: 'chat' | 'copilot';
  allowed_domains?: string[];
  app_id?: number;
  persona_id?: number;
  welcome_message?: string;
  theme_color?: string;
}

export interface IntegrationCreateResponse {
  integration_id: number;
  mode: string;
  publishable_key: string;
  secret_key: string;
  embed: string;
  note: string;
}

export interface IntegrationPatchRequest {
  name?: string;
  mode?: 'chat' | 'copilot';
  allowed_domains?: string[];
  app_id?: number;
  persona_id?: number;
  is_active?: boolean;
}

export interface KeyRotateResponse {
  publishable_key: string;
  secret_key: string;
  note: string;
}

export interface AuditEntry {
  id: number;
  session_id: string;
  tool_name: string;
  target_label: string;
  tool_args: string;
  result: string;
  status: string;
  client_ip: string;
  end_user_id: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmbedIntegrationsService {
  private baseUrl = `${environment.apiUrl}/v1/integrations`;

  constructor(private http: HttpClient) {}

  list(): Observable<EmbedIntegration[]> {
    return this.http.get<EmbedIntegration[]>(this.baseUrl);
  }

  create(body: IntegrationCreateRequest): Observable<IntegrationCreateResponse> {
    return this.http.post<IntegrationCreateResponse>(this.baseUrl, body);
  }

  patch(id: number, body: IntegrationPatchRequest): Observable<{ updated: boolean }> {
    return this.http.patch<{ updated: boolean }>(`${this.baseUrl}/${id}`, body);
  }

  rotateKeys(id: number): Observable<KeyRotateResponse> {
    return this.http.post<KeyRotateResponse>(`${this.baseUrl}/${id}/rotate-keys`, {});
  }

  getAuditLog(id: number, limit = 50, offset = 0): Observable<AuditEntry[]> {
    return this.http.get<AuditEntry[]>(
      `${this.baseUrl}/${id}/audit`,
      { params: { limit: limit.toString(), offset: offset.toString() } }
    );
  }
}
