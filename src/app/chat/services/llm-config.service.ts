import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface LlmConfig {
  provider: string;
  model: string;
  base_url: string;
  api_key: string;
  provider_order: string;
  max_tokens: string;
  temperature: string;
}

@Injectable({
  providedIn: 'root'
})
export class LlmConfigService {
  private apiUrl = `${environment.apiUrl}/v1/admin/llm-config`;

  constructor(private http: HttpClient) {}

  getConfig(): Observable<LlmConfig> {
    return this.http.get<LlmConfig>(this.apiUrl);
  }

  updateConfig(config: Partial<LlmConfig>): Observable<any> {
    return this.http.put(this.apiUrl, config);
  }

  syncOpenRouterModels(): Observable<any> {
    return this.http.post(`${this.apiUrl}/sync`, {});
  }
}
