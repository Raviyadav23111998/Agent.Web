import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface Agent {
  agentId: number;
  name: string;
  description: string | null;
  model: string | null;
  enabled: boolean;
  visibility: string;
  runCount: number;
  lastRunAt: string | null;
  lastStatus: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AgentService {

  private apiBase = `${environment.apiUrl}/v1/agents`;
  public agents$ = new BehaviorSubject<Agent[]>([]);
  public loading$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {}

  loadAgents(): void {
    this.loading$.next(true);
    this.http.get<Agent[]>(this.apiBase).subscribe({
      next: (agents) => {
        this.agents$.next(agents);
        this.loading$.next(false);
      },
      error: (err) => {
        console.error('Failed to load agents', err);
        this.loading$.next(false);
      }
    });
  }

  getAgent(agentId: number): Observable<Agent> {
    return this.http.get<Agent>(`${this.apiBase}/${agentId}`);
  }
}
