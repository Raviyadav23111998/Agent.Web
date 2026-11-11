import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface CronRepeatConfig {
  times: number | null;
  completed: number;
}

export interface CronJob {
  id: string;
  db_id: number;
  name: string;
  prompt: string;
  schedule: any;
  schedule_display: string;
  repeat: CronRepeatConfig;
  enabled: boolean;
  state: string;
  created_at: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string;
  last_error: string;
  deliver: string;
  app_id?: number;
  persona_id?: number | null;
  origin?: any;
}

export interface CronJobCreateRequest {
  name?: string;
  prompt: string;
  schedule: string;
  repeat_times?: number | null;
  deliver?: string;
  app_id?: number;
  persona_id?: number | null;
}

export interface CronJobUpdateRequest {
  name?: string;
  prompt?: string;
  schedule?: string;
  repeat_times?: number | null;
  deliver?: string;
  enabled?: boolean;
  app_id?: number;
  persona_id?: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class CronAdminService {
  private apiUrl = `${environment.apiUrl}/v1/admin/crons`;

  constructor(private http: HttpClient) {}

  listJobs(): Observable<CronJob[]> {
    return this.http.get<CronJob[]>(this.apiUrl);
  }

  getJob(id: string): Observable<CronJob> {
    return this.http.get<CronJob>(`${this.apiUrl}/${id}`);
  }

  createJob(job: CronJobCreateRequest): Observable<CronJob> {
    return this.http.post<CronJob>(this.apiUrl, job);
  }

  updateJob(id: string, job: CronJobUpdateRequest): Observable<CronJob> {
    return this.http.put<CronJob>(`${this.apiUrl}/${id}`, job);
  }

  deleteJob(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
