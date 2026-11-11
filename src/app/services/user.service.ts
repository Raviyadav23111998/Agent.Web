import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { UserByIdResponse, UserRequest, UsersListItem, UserSummary, UsersPagedResponse, RoleItem } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/v1/users`;

  constructor(private http: HttpClient) { }

  getUsers(skip: number = 0, take: number = 10, search?: string, sortField?: string, sortDir?: string): Observable<UsersPagedResponse> {
    let params: any = { skip, take };
    if (search) params.search = search;
    if (sortField) params.sort_field = sortField;
    if (sortDir) params.sort_dir = sortDir;
    return this.http.get<UsersPagedResponse>(this.apiUrl, { params });
  }

  getUser(id: number): Observable<UserByIdResponse> {
    return this.http.get<UserByIdResponse>(`${this.apiUrl}/${id}`);
  }

  createUser(user: UserRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, user);
  }

  updateUser(id: number, user: UserRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, user);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  getUsersDdl(searchText?: string, role?: string): Observable<UserSummary[]> {
    let params: any = {};
    if (searchText) params.SearchText = searchText;
    if (role) params.role = role;
    return this.http.get<UserSummary[]>(`${this.apiUrl}/ddl`, { params });
  }

  getRoles(): Observable<RoleItem[]> {
    return this.http.get<RoleItem[]>(`${this.apiUrl}/roles`);
  }
  
  validateEmail(email: string): Observable<{exists: boolean, message: string}> {
    return this.http.get<{exists: boolean, message: string}>(`${this.apiUrl}/Validate/Email`, { params: { email } });
  }

  validateUserCode(userCode: string, userId?: number): Observable<{exists: boolean, message: string}> {
    let params: any = { userCode };
    if (userId) params.userId = userId;
    return this.http.get<{exists: boolean, message: string}>(`${this.apiUrl}/Validate/UserCode`, { params });
  }
}
