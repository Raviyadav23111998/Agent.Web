import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Skill {
  skill_id: number;
  name: string;
  description: string;
  tags: string[];
  body: string;
  scope_type: 'tenant' | 'app' | 'user';
  scope_id: number | null;
  origin: 'agent' | 'user' | 'bundled';
  pinned: boolean;
  is_active: boolean;
  version: number;
  use_count: number;
  correction_after_use: number;
  created_at?: string;
  updated_at?: string;
}

export interface SkillVersion {
  version_id: number;
  version: number;
  edited_by: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class SkillsAdminService {
  private base = `${environment.apiUrl}/v1/admin/skills`;

  constructor(private http: HttpClient) {}

  list(): Observable<Skill[]> {
    return this.http.get<Skill[]>(this.base);
  }

  update(id: number, body: Partial<{ description: string; body: string;
                                     tags: string[]; pinned: boolean }>): Observable<any> {
    return this.http.put(`${this.base}/${id}`, body);
  }

  archive(id: number): Observable<any> {
    return this.http.post(`${this.base}/${id}/archive`, {});
  }

  versions(id: number): Observable<SkillVersion[]> {
    return this.http.get<SkillVersion[]>(`${this.base}/${id}/versions`);
  }

  rollback(id: number, version: number): Observable<any> {
    return this.http.post(`${this.base}/${id}/rollback/${version}`, {});
  }
}
