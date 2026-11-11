import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmailTemplateRequest {
  templateId?: number;
  type: string;
  subject: string;
  body: string;
  dataFields: string;
}

export interface NotificationItem {
  notification_id: number;
  final_title: string;
  final_body: string;
  created_at: Date;
  data_payload: any;
  recipient_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = `${environment.apiUrl}/v1/notification`;

  constructor(private http: HttpClient) {}

  getUnreadNotifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(`${this.apiUrl}/unread`);
  }

  markAsRead(recipientId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/read/${recipientId}`, {});
  }

  saveEmailTemplate(template: EmailTemplateRequest): Observable<{ templateId: number }> {
    if (template.templateId) {
      return this.http.put<{ templateId: number }>(`${this.apiUrl}/templates/email/${template.templateId}`, template);
    } else {
      return this.http.post<{ templateId: number }>(`${this.apiUrl}/templates/email`, template);
    }
  }
}
