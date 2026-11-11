import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface IntegrationSummary {
  integration_id: number;
  slug: string;
  display_name: string;
  base_url: string;
  spec_kind: string;
  auth_provider: string | null;
  security_scheme: string | null;
  auth_type?: string | null;
  status: string;
  allow_private: boolean;
  op_count: number;
  created_at?: string;
}

export interface IntegrationOperation {
  operation_id: string;
  tool_name: string;
  http_method: string;
  path_template: string;
  description?: string;
  side_effect: string;
  requires_approval: boolean;
  enabled: boolean;
  embed_safe: boolean;
}

export interface IntegrationGrant {
  grant_id: number;
  scope: string;
  ref: string;
  op_filter: string[] | null;
}

export interface IntegrationDetail extends IntegrationSummary {
  egress_allow: string[];
  auth_config: any;
  default_headers?: Record<string, string>;
  operations: IntegrationOperation[];
  grants: IntegrationGrant[];
}

export interface ImportReport {
  slug: string;
  integration_id: number;
  operation_count: number;
  added: number;
  updated: number;
  deprecated: number;
  embedded: number;
  unchanged: boolean;
  security_scheme: string | null;
  auth_provider: string | null;
  warnings: string[];
}

export interface AppOption { appId: number; name: string; }
export interface PersonaOption { personaId: number; appId: number; name: string; }

@Injectable({ providedIn: 'root' })
export class IntegrationService {
  private base = `${environment.apiUrl}/v1/api-integrations`;
  private appsBase = `${environment.apiUrl}/v1/admin/apps`;

  constructor(private http: HttpClient) {}

  list(): Observable<IntegrationSummary[]> {
    return this.http.get<IntegrationSummary[]>(this.base);
  }

  listApps(): Observable<AppOption[]> {
    return this.http.get<AppOption[]>(this.appsBase);
  }

  listPersonas(appId: number): Observable<PersonaOption[]> {
    return this.http.get<PersonaOption[]>(`${this.appsBase}/${appId}/personas`);
  }

  detail(id: number): Observable<IntegrationDetail> {
    return this.http.get<IntegrationDetail>(`${this.base}/${id}`);
  }

  import(body: {
    slug: string; source?: string; spec?: any;
    display_name?: string; allow_private?: boolean;
  }): Observable<ImportReport> {
    return this.http.post<ImportReport>(`${this.base}/import`, body);
  }

  patchIntegration(id: number, body: {
    status?: string; egress_allow?: string[]; allow_private?: boolean;
    auth_type?: string; auth_config?: any; default_headers?: any;
  }): Observable<any> {
    return this.http.patch(`${this.base}/${id}`, body);
  }

  patchOperation(id: number, operationId: string, body: {
    enabled?: boolean; side_effect?: string;
    requires_approval?: boolean; embed_safe?: boolean;
  }): Observable<any> {
    return this.http.patch(`${this.base}/${id}/ops/${encodeURIComponent(operationId)}`, body);
  }

  reimport(id: number): Observable<any> {
    return this.http.post(`${this.base}/${id}/reimport`, {});
  }

  test(id: number): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(`${this.base}/${id}/test`, {});
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  listGrants(id: number): Observable<IntegrationGrant[]> {
    return this.http.get<IntegrationGrant[]>(`${this.base}/${id}/grants`);
  }

  addGrant(id: number, body: {
    scope: string; ref?: string; op_filter?: string[];
  }): Observable<{ grant_id: number }> {
    return this.http.post<{ grant_id: number }>(`${this.base}/${id}/grants`, body);
  }

  deleteGrant(id: number, grantId: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}/grants/${grantId}`);
  }
}
