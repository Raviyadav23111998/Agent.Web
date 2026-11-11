import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Bot {
  bot_id: number;
  bot_uuid: string;
  name: string;
  description: string;
  api_token_prefix?: string;
  allowed_domains: string[];
  system_prompt: string;
  welcome_message: string;
  model: string;
  theme_color: string;
  max_context_docs: number;
  is_active: boolean;
  app_id?: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface BotCreateResponse extends Bot {
  api_token: string;
}

export interface BotCreateRequest {
  name: string;
  description?: string;
  allowed_domains?: string[];
  system_prompt?: string;
  welcome_message?: string;
  model?: string;
  theme_color?: string;
  max_context_docs?: number;
  is_active?: boolean;
  app_id?: number;
}

export interface BotRule {
  rule_id?: number;
  bot_id?: number;
  rule_type: 'url_contains' | 'url_exact' | 'url_regex' | 'fallback';
  pattern: string;
  instruction: string;
  priority: number;
  is_active: boolean;
  created_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BotAdminService {
  private apiUrl = `${environment.apiUrl}/v1/admin/bots`;

  constructor(private http: HttpClient) {}

  listBots(): Observable<Bot[]> {
    return this.http.get<Bot[]>(this.apiUrl);
  }

  getBot(id: number): Observable<Bot> {
    return this.http.get<Bot>(`${this.apiUrl}/${id}`);
  }

  createBot(bot: BotCreateRequest): Observable<BotCreateResponse> {
    return this.http.post<BotCreateResponse>(this.apiUrl, bot);
  }

  updateBot(id: number, bot: BotCreateRequest): Observable<Bot> {
    return this.http.put<Bot>(`${this.apiUrl}/${id}`, bot);
  }

  deleteBot(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getRules(botId: number): Observable<BotRule[]> {
    return this.http.get<BotRule[]>(`${this.apiUrl}/${botId}/rules`);
  }

  setRules(botId: number, rules: BotRule[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/${botId}/rules`, rules);
  }
}
