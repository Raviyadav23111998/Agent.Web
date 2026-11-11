import { Injectable } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface TeamsStatus {
  tenantDomain: string;
  displayName: string;
  m365Connected: boolean;
  botClientId: string;
  messagingEndpoint: string;
  ready: boolean;
}

export interface VscodeStatus {
  available: boolean;
  version: string;
  filename: string;
  marketplaceUrl: string;
  tenantDomain: string;
}

export type VisualStudioStatus = VscodeStatus;

@Injectable({ providedIn: 'root' })
export class ChannelsService {
  private base = `${environment.apiUrl}/v1/channels`;

  constructor(private http: HttpClient) {}

  getTeamsStatus(): Observable<TeamsStatus> {
    return this.http.get<TeamsStatus>(`${this.base}/teams/status`);
  }

  downloadTeamsApp(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/teams/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  getVscodeStatus(): Observable<VscodeStatus> {
    return this.http.get<VscodeStatus>(`${this.base}/vscode/status`);
  }

  downloadVscodeApp(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/vscode/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }

  getVisualStudioStatus(): Observable<VisualStudioStatus> {
    return this.http.get<VisualStudioStatus>(`${this.base}/visualstudio/status`);
  }

  downloadVisualStudioApp(): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.base}/visualstudio/download`, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
