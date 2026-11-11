import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LlmProfile {
  profile_id?: number;
  name: string;
  provider: string;
  model: string;
  base_url: string;
  api_key?: string;
  small_model?: string | null;
  fallback_model?: string | null;
  temperature?: number | null;
  max_tokens?: number | null;
  reasoning_effort?: string | null;
  is_default?: boolean;
  is_active?: boolean;
  updated_at?: string;
}

export interface Budget {
  budget_id?: number;
  scope_type: 'user' | 'app' | 'tenant';
  scope_id?: number | null;
  win: 'day' | 'week' | 'month';
  max_tokens: number;
  max_usd: number;
  action: 'block' | 'warn';
  is_active?: boolean;
}

export interface UsageRow {
  grp: any;
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost_usd: number;
}

@Injectable({ providedIn: 'root' })
export class LlmProfilesService {
  private base = `${environment.apiUrl}/v1/admin`;

  constructor(private http: HttpClient) {}

  listProfiles(): Observable<LlmProfile[]> {
    return this.http.get<LlmProfile[]>(`${this.base}/llm-profiles`);
  }
  createProfile(p: LlmProfile): Observable<LlmProfile> {
    return this.http.post<LlmProfile>(`${this.base}/llm-profiles`, p);
  }
  updateProfile(id: number, p: Partial<LlmProfile>): Observable<LlmProfile> {
    return this.http.put<LlmProfile>(`${this.base}/llm-profiles/${id}`, p);
  }
  deleteProfile(id: number): Observable<any> {
    return this.http.delete(`${this.base}/llm-profiles/${id}`);
  }
  bind(scope: 'app' | 'user', scopeId: number, profileId: number | null): Observable<any> {
    return this.http.post(`${this.base}/llm-profiles/bind`,
      { scope, scope_id: scopeId, profile_id: profileId });
  }

  listBudgets(): Observable<Budget[]> {
    return this.http.get<Budget[]>(`${this.base}/budgets`);
  }
  upsertBudget(b: Budget): Observable<Budget> {
    return this.http.post<Budget>(`${this.base}/budgets`, b);
  }
  deleteBudget(id: number): Observable<any> {
    return this.http.delete(`${this.base}/budgets/${id}`);
  }

  usage(groupBy: string, days: number): Observable<UsageRow[]> {
    const params = new HttpParams().set('group_by', groupBy).set('days', days);
    return this.http.get<UsageRow[]>(`${this.base}/usage`, { params });
  }
}
