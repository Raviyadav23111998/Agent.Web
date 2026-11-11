import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DocumentDTO {
  docId: number;
  doc_id?: number;
  sourcePath: string;
  source_path?: string;
  docType: string;
  doc_type?: string;
  title?: string;
  content?: string;
  contentHash?: string;
  content_hash?: string;
  tokenCount: number;
  token_count?: number;
  status: string;
  ownerId?: string;
  owner_id?: string;
  appId?: number;
  app_id?: number;
  createdAt?: string;
  created_at?: string;
}

export interface IngestRequest {
  sourcePath: string;
  content: string;
  title?: string;
  docType: string;
  appId?: number;
}

export interface SearchResult {
  docId: number;
  title?: string;
  snippet?: string;
  sourcePath: string;
  rank?: number;
}

export interface BrainStats {
  total: number;
  indexed: number;
  total_tokens: number;
}

export interface BrainPillarHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'not_configured';
  reachable?: boolean;
  error?: string;
  es_docs?: number;
  indexed_ok?: number;
  embedded_ok?: number;
  pending?: number;
  coverage_pct?: number;
  model?: string;
  dim?: number;
  index?: string;
  documents?: number;
}

export interface BrainHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  documents: number;
  components: {
    document_store: BrainPillarHealth;
    lexical: BrainPillarHealth;
    graph: BrainPillarHealth;
    vector: BrainPillarHealth;
  };
}

@Injectable({
  providedIn: 'root'
})
export class BrainService {
  private apiBase = `${environment.apiUrl}/v1/brain`;

  constructor(private http: HttpClient) {}

  getDocuments(appId?: number): Observable<DocumentDTO[]> {
    const params: any = {};
    if (appId !== undefined && appId !== null) params.appId = appId;
    return this.http.get<DocumentDTO[]>(`${this.apiBase}/documents`, { params });
  }

  getDocument(docId: number): Observable<DocumentDTO> {
    return this.http.get<DocumentDTO>(`${this.apiBase}/documents/${docId}`);
  }

  ingestDocument(req: IngestRequest): Observable<any> {
    return this.http.post<any>(`${this.apiBase}/ingest`, req);
  }

  deleteDocument(docId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiBase}/documents/${docId}`);
  }

  getStats(appId?: number): Observable<BrainStats> {
    const params: any = {};
    if (appId !== undefined && appId !== null) params.appId = appId;
    return this.http.get<BrainStats>(`${this.apiBase}/stats`, { params });
  }

  getHealth(): Observable<BrainHealth> {
    return this.http.get<BrainHealth>(`${this.apiBase}/health`);
  }

  search(query: string, docType?: string, limit: number = 10, appId?: number): Observable<SearchResult[]> {
    const body = { query, docType, limit };
    const params: any = {};
    if (appId !== undefined && appId !== null) params.appId = appId;
    return this.http.post<SearchResult[]>(`${this.apiBase}/search`, body, { params });
  }
}
