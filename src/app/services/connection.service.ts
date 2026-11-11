import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ConnField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'url' | 'number' | 'password' | 'boolean';
  required?: boolean;
  secret?: boolean;
  scope?: 'org' | 'identity' | 'both';
  help?: string;
  placeholder?: string;
  default?: any;
}

export interface ConnProvider {
  provider_key: string;
  display_name: string;
  category: string;
  kind: 'direct' | 'shared_app';
  fields: ConnField[];
  supports_user: boolean;
  supports_verify: boolean;
  icon_url?: string;
  docs_url?: string;
}

export interface Connection {
  connection_id: number;
  provider_key: string;
  scope: 'org' | 'user' | 'app';
  owner_ref: string;
  label: string;
  status: string;
  config_keys: string[];
  has_secret: boolean;
  is_readonly: boolean;
  last_used_at?: string;
  created_at?: string;
}

export interface ConnectionCreate {
  provider: string;
  scope: 'org' | 'user' | 'app';
  owner_ref?: string;
  label: string;
  fields: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class ConnectionService {
  private base = `${environment.apiUrl}/v1/connections`;

  constructor(private http: HttpClient) {}

  getProviders(): Observable<ConnProvider[]> {
    return this.http.get<ConnProvider[]>(`${this.base}/providers`);
  }

  list(): Observable<Connection[]> {
    return this.http.get<Connection[]>(this.base);
  }

  create(body: ConnectionCreate): Observable<any> {
    return this.http.post(this.base, body);
  }

  detail(id: number): Observable<{ config: Record<string, any>; label: string; scope: string }> {
    return this.http.get<any>(`${this.base}/${id}/detail`);
  }

  update(id: number, body: { label?: string; fields?: Record<string, any>; status?: string }): Observable<any> {
    return this.http.put(`${this.base}/${id}`, body);
  }

  remove(id: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}`);
  }

  test(id: number): Observable<{ ok: boolean; message: string }> {
    return this.http.post<{ ok: boolean; message: string }>(`${this.base}/${id}/test`, {});
  }
}

export interface ConnFormField {
  key: string;
  schema: ConnField;
  value: any;
  isSecret: boolean;
}

const PROVIDER_ICONS: Record<string, string> = {
  jira: '🔗', m365: '📧', smtp: '📮', imap: '📥',
  confluence: '📄', slack: '💬', telegram: '📱',
};
export function providerIcon(key: string): string {
  return PROVIDER_ICONS[key] || '🔌';
}

export function buildFields(
  provider: ConnProvider,
  existing: Record<string, any> = {},
  surface: 'user' | 'org' = 'user',
): ConnFormField[] {
  const skip = surface === 'user' ? 'org' : 'identity';
  return (provider.fields || [])
    .filter(f => f.scope !== skip)
    .map(f => ({
      key: f.key,
      schema: f,
      value: existing[f.key] !== undefined ? existing[f.key] : (f.secret ? '' : (f.default ?? '')),
      isSecret: !!f.secret,
    }));
}

export function collectFields(fields: ConnFormField[]): Record<string, any> {
  const out: Record<string, any> = {};
  for (const f of fields) {
    if (f.isSecret) {
      if (f.value && f.value !== '••••••') out[f.key] = f.value;
    } else if (f.value !== '' && f.value !== null && f.value !== undefined) {
      out[f.key] = f.value;
    }
  }
  return out;
}
