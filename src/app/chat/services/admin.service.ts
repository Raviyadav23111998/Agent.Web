import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  users_count: number;
  conversations_count: number;
  brain_docs_count: number;
  memories_count: number;
  active_crons: number;
  apps_count: number;
  bots_count: number;
  agents_count: number;
  recent_audit: AuditEntry[];
  recent_conversations: RecentConversation[];
}

export interface AuditEntry {
  auditId: number;
  userId: number | null;
  conversationId?: string;
  toolName: string;
  sideEffect: string;
  argsSummary: string;
  approved: boolean | null;
  status: string;
  createdAt: string;
}

export interface RecentConversation {
  conversationId: string;
  title: string | null;
  userId: number;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAudit {
  total: number;
  skip: number;
  take: number;
  items: AuditEntry[];
}

export interface AuditSummary {
  by_status: Record<string, number>;
  by_side_effect: Record<string, number>;
  top_tools: { tool: string; count: number }[];
  total: number;
}

export interface PaginatedConversations {
  total: number;
  skip: number;
  take: number;
  items: AdminConversation[];
}

export interface AdminConversation {
  conversationId: string;
  title: string | null;
  userId: number;
  agentId: number | null;
  model: string;
  messageCount: number;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminConversationDetail extends AdminConversation {
  isArchived: boolean;
  messages: { messageId: number; role: string; content: string; tokenCount: number; createdAt: string }[];
}

export interface HealthResponse {
  status: string;
  version: string;
  service: string;
  uptime_seconds: number;
  db_connected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private apiBase = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiBase}/v1/admin/dashboard/stats`);
  }

  getHealth(): Observable<HealthResponse> {
    return this.http.get<HealthResponse>(`${this.apiBase}/health`);
  }

  getMetrics(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/metrics.json`);
  }

  listAudit(params: {
    toolName?: string; userId?: number; status?: string;
    sideEffect?: string; from?: string; to?: string;
    skip?: number; take?: number;
  } = {}): Observable<PaginatedAudit> {
    let httpParams = new HttpParams();
    if (params.toolName) httpParams = httpParams.set('tool_name', params.toolName);
    if (params.userId != null) httpParams = httpParams.set('user_id', params.userId.toString());
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.sideEffect) httpParams = httpParams.set('side_effect', params.sideEffect);
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.skip != null) httpParams = httpParams.set('skip', params.skip.toString());
    if (params.take != null) httpParams = httpParams.set('take', params.take.toString());
    return this.http.get<PaginatedAudit>(`${this.apiBase}/v1/admin/audit`, { params: httpParams });
  }

  getAuditSummary(): Observable<AuditSummary> {
    return this.http.get<AuditSummary>(`${this.apiBase}/v1/admin/audit/summary`);
  }

  listConversations(params: {
    userId?: number; source?: string; search?: string;
    skip?: number; take?: number;
  } = {}): Observable<PaginatedConversations> {
    let httpParams = new HttpParams();
    if (params.userId != null) httpParams = httpParams.set('user_id', params.userId.toString());
    if (params.source) httpParams = httpParams.set('source', params.source);
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.skip != null) httpParams = httpParams.set('skip', params.skip.toString());
    if (params.take != null) httpParams = httpParams.set('take', params.take.toString());
    return this.http.get<PaginatedConversations>(`${this.apiBase}/v1/admin/conversations`, { params: httpParams });
  }

  getConversation(id: string): Observable<AdminConversationDetail> {
    return this.http.get<AdminConversationDetail>(`${this.apiBase}/v1/admin/conversations/${id}`);
  }

  deleteConversation(id: string): Observable<any> {
    return this.http.delete(`${this.apiBase}/v1/admin/conversations/${id}`);
  }

  listAgents(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/v1/agents`);
  }

  getAgent(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/v1/agents/${id}`);
  }

  getAgentRuns(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiBase}/v1/agents/${id}/runs`);
  }

  listMemories(category?: string): Observable<any[]> {
    let httpParams = new HttpParams();
    if (category) httpParams = httpParams.set('category', category);
    return this.http.get<any[]>(`${this.apiBase}/v1/memory`, { params: httpParams });
  }

  searchMemories(query: string, category?: string): Observable<any[]> {
    const body: any = { query };
    if (category) body.category = category;
    return this.http.post<any[]>(`${this.apiBase}/v1/memory/recall`, body);
  }

  deleteMemory(id: number): Observable<any> {
    return this.http.delete(`${this.apiBase}/v1/memory/${id}`);
  }

  getMemoryStats(): Observable<any> {
    return this.http.get<any>(`${this.apiBase}/v1/memory/stats`);
  }
}
