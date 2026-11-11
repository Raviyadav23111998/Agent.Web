import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ApplicationDTO {
  appId: number;
  appUuid: string;
  name: string;
  description: string;
  appType: string;
  llmModel?: string;
  llmProfileId?: number | null;
  maxTokensDay: number;
  maxDocuments: number;
  isActive: boolean;
  createdBy?: number;
  createdAt?: string;
  updatedAt?: string;
  docCount: number;
  botCount: number;
  cronCount: number;
}

export interface ApplicationCreateRequest {
  name: string;
  description?: string;
  appType?: string;
  llmModel?: string;
  maxTokensDay?: number;
  maxDocuments?: number;
}

export interface ApplicationUpdateRequest {
  name?: string;
  description?: string;
  appType?: string;
  llmModel?: string;
  maxTokensDay?: number;
  maxDocuments?: number;
  isActive?: boolean;
}

/** Input scope rail config (persona.scope_policy JSONB). Inner keys are the
 *  raw stored keys (snake_case) — only the top-level field name is camelCased. */
export interface ScopePolicy {
  mode?: 'off' | 'restrict';
  domain?: string;
  refusal_message?: string;
  fail_open?: boolean;
}

export interface PersonaDTO {
  personaId: number;
  appId: number;
  name: string;
  description: string;
  identityPrompt: string;
  constraintsPrompt: string;
  communicationPrompt: string;
  allowedTools: string[];
  disablePassivityCorrection: boolean;
  isDefault: boolean;
  isActive: boolean;
  inputGuardrailPrompt?: string;
  executionPolicies?: any;
  outputDlpPatterns?: string[];
  outputSemanticRules?: string;
  scopePolicy?: ScopePolicy;

  approvalMode?: 'irreversible' | 'off' | null;
  createdAt: string;
  updatedAt?: string;
  appName?: string;
}

export interface PersonaCreateRequest {
  name: string;
  description?: string;
  identityPrompt: string;
  constraintsPrompt: string;
  communicationPrompt: string;
  allowedTools: string[];
  disablePassivityCorrection?: boolean;
  isDefault?: boolean;
  inputGuardrailPrompt?: string;
  executionPolicies?: any;
  outputDlpPatterns?: string[];
  outputSemanticRules?: string;
  scopePolicy?: ScopePolicy;

  approvalMode?: 'irreversible' | 'off' | '';
}

export interface PersonaUpdateRequest {
  name?: string;
  description?: string;
  identityPrompt?: string;
  constraintsPrompt?: string;
  communicationPrompt?: string;
  allowedTools?: string[];
  disablePassivityCorrection?: boolean;
  isDefault?: boolean;
  isActive?: boolean;
  inputGuardrailPrompt?: string;
  executionPolicies?: any;
  outputDlpPatterns?: string[];
  outputSemanticRules?: string;
  scopePolicy?: ScopePolicy;

  approvalMode?: 'irreversible' | 'off' | '';
}

@Injectable({
  providedIn: 'root'
})
export class AppAdminService {
  private apiUrl = `${environment.apiUrl}/v1/admin/apps`;

  private _apps$ = new BehaviorSubject<ApplicationDTO[]>([]);
  public apps$ = this._apps$.asObservable();

  constructor(private http: HttpClient) {}

  listApps(): Observable<ApplicationDTO[]> {
    return this.http.get<ApplicationDTO[]>(this.apiUrl).pipe(
      tap(apps => this._apps$.next(apps))
    );
  }

  getApp(appId: number): Observable<ApplicationDTO> {
    return this.http.get<ApplicationDTO>(`${this.apiUrl}/${appId}`);
  }

  createApp(req: ApplicationCreateRequest): Observable<ApplicationDTO> {
    return this.http.post<ApplicationDTO>(this.apiUrl, req).pipe(
      tap(() => this.listApps().subscribe())
    );
  }

  updateApp(appId: number, req: ApplicationUpdateRequest): Observable<ApplicationDTO> {
    return this.http.put<ApplicationDTO>(`${this.apiUrl}/${appId}`, req).pipe(
      tap(() => this.listApps().subscribe())
    );
  }

  deleteApp(appId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${appId}`).pipe(
      tap(() => this.listApps().subscribe())
    );
  }

  getCachedApps(): ApplicationDTO[] {
    return this._apps$.value;
  }

  getAvailableTools(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/tools`);
  }

  listPersonas(appId: number): Observable<PersonaDTO[]> {
    return this.http.get<PersonaDTO[]>(`${this.apiUrl}/${appId}/personas`);
  }

  createPersona(appId: number, req: PersonaCreateRequest): Observable<PersonaDTO> {
    return this.http.post<PersonaDTO>(`${this.apiUrl}/${appId}/personas`, req);
  }

  updatePersona(personaId: number, req: PersonaUpdateRequest): Observable<PersonaDTO> {
    return this.http.put<PersonaDTO>(`${this.apiUrl}/personas/${personaId}`, req);
  }

  deletePersona(personaId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/personas/${personaId}`);
  }
}
