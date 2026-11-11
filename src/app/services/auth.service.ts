import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { SharedDataService } from './shared-data.service';
import { lastValueFrom } from 'rxjs';
import { jwtDecode } from 'jwt-decode';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface UserSession {
  userId: string;
  userCode: string;
  name: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  loginTime: number;
}

export interface LoginResponseModel {
  message: string;
  isAuthenticated: boolean;
  accessToken: string;
  refreshToken: string;
  user?: {
    user_id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    display_name: string;
  };
}

export interface ChangePasswordResponseModel {
  message: string;
  isSuccess: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl: string = '';
  private loginUrl: string = '';
  private logoutUrl: string = '';
  private changePasswordUrl: string = '';

  private readonly SESSIONS_KEY = 'auth_sessions';
  private readonly ACTIVE_USER_KEY = 'active_user_id';

  constructor(
    private http: HttpClient,
    private sharedDataService: SharedDataService,
    private router: Router
  ) {
    this.baseUrl = environment.apiUrl;

    this.loginUrl = this.baseUrl + '/Login';
    this.logoutUrl = this.baseUrl + '/Logout';
    this.changePasswordUrl = this.baseUrl + '/ChangePassword';
  }

  async login_Client_Credentials(UserName: string, Password: string): Promise<boolean> {

    const body = {
      grantType: 'client_credentials',
      userName: UserName,
      password: Password
    };
    return this.processLogin(body);
  }

  async login_External_Client(TokenProvider: string, Token: string): Promise<boolean> {
    const body = {
      grantType: 'external_client',
      token: {
        tokenProvider: TokenProvider,
        token: Token
      }
    };
    return this.processLogin(body);
  }

  private async processLogin(body: any): Promise<boolean> {
    try {
      const res = await lastValueFrom(
        this.http.post<LoginResponseModel>(this.loginUrl, body)
      );

      if (res.isAuthenticated || res.message === 'Valid User!') {
        this.saveSession(res);
        this.sharedDataService.showSuccess('Login Successful');
        return true;
      }
      return false;
    } catch (error) {
      this.handleLoginError(error);
      return false;
    }
  }

  refreshToken() {

    const body = {
      grantType: 'refresh_token',
      token: {
        token: this.GetToken() || '',
        refreshToken: this.GetRefreshToken() || ''
      }
    };
    return this.http.post<LoginResponseModel>(this.loginUrl, body);
  }

  changePassword(data: {
    requestType: string;
    userCode?: string;
    password?: string;
    accessToken?: string;
    OTP?: string;
  }) {
    return this.http.post<ChangePasswordResponseModel>(this.changePasswordUrl, data);
  }

  public saveLoginResponse(response: LoginResponseModel) {
    this.saveSession(response);
  }

  private saveSession(response: LoginResponseModel) {
    const decoded: any = this.decodeToken(response.accessToken);
    if (!decoded) return;

    const userId = decoded.user_ID || decoded.user_Id || decoded.sub || decoded.nameid;

    const newSession: UserSession = {
      userId: userId,
      userCode: decoded.user_code || '',
      name: ((decoded.first_name || '') + ' ' + (decoded.last_name || '')).trim() || 'User',
      role: decoded.role || 'User',
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      loginTime: Date.now()
    };

    const sessions = this.getAllSessions();
    sessions[userId] = newSession;
    localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    this.setActiveUser(userId);
  }

  setActiveUser(userId: string) {
    const sessions = this.getAllSessions();
    if (sessions[userId]) {
      localStorage.setItem(this.ACTIVE_USER_KEY, userId);
    }
  }

  logout() {

    const token = this.GetToken();
    const headers = token
      ? new HttpHeaders({ 'Authorization': 'Bearer ' + token })
      : new HttpHeaders();

    this.http.get(this.logoutUrl, { headers }).subscribe({
      next: () => {},
      error: () => {}
    });

    const activeUserId = localStorage.getItem(this.ACTIVE_USER_KEY);
    const sessions = this.getAllSessions();

    if (activeUserId && sessions[activeUserId]) {
      delete sessions[activeUserId];
      localStorage.setItem(this.SESSIONS_KEY, JSON.stringify(sessions));
    }

    const remainingUserIds = Object.keys(sessions);
    if (remainingUserIds.length > 0) {
      this.setActiveUser(remainingUserIds[0]);
      this.sharedDataService.showInfo('Switched to next account.');
      this.router.navigate(['/chat']);
    } else {
      this.clearLoginResponse();
      this.sharedDataService.isLoggedIn = false;
      this.router.navigate(['/login']);
    }
  }

  clearLoginResponse() {
    localStorage.removeItem(this.SESSIONS_KEY);
    localStorage.removeItem(this.ACTIVE_USER_KEY);
  }

  public getAvailableAccounts(): UserSession[] {
    const sessions = this.getAllSessions();
    return Object.values(sessions);
  }

  public getActiveSession(): UserSession | null {
    const activeUserId = localStorage.getItem(this.ACTIVE_USER_KEY);
    const sessions = this.getAllSessions();
    if (activeUserId && sessions[activeUserId]) {
      return sessions[activeUserId];
    }
    return null;
  }

  GetToken(): string | null {
    const session = this.getActiveSession();
    return session ? session.accessToken : null;
  }

  GetRefreshToken(): string | null {
    const session = this.getActiveSession();
    return session ? session.refreshToken : null;
  }

  parseJWT(): any {
    return this.decodeToken(this.GetToken());
  }

  isAuthenticated(): boolean {
    const token = this.GetToken();
    if (!token) return false;

    const decoded: any = this.decodeToken(token);
    if (!decoded || !decoded.exp) return false;

    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) return false;

    this.sharedDataService.isLoggedIn = true;
    return true;
  }

  private getAllSessions(): { [key: string]: UserSession } {
    const json = localStorage.getItem(this.SESSIONS_KEY);
    try {
      return json ? JSON.parse(json) : {};
    } catch {

      localStorage.removeItem(this.SESSIONS_KEY);
      return {};
    }
  }

  private decodeToken(token: string | null) {
    if (!token) return null;
    try {
      return jwtDecode(token);
    } catch (error) {
      console.error('Invalid JWT Token:', error);
      return null;
    }
  }

  private handleLoginError(error: any) {
    if (error instanceof HttpErrorResponse && error.status === 401) {

      const msg = error.error?.detail || error.error?.message || '';
      this.sharedDataService.showError(msg || 'Invalid username or password');
    } else if (error instanceof HttpErrorResponse && error.status === 429) {

      this.sharedDataService.showError('Too many login attempts. Please wait and try again.');
    } else if (error instanceof HttpErrorResponse && error.status === 422) {
      this.sharedDataService.showError('Please enter valid credentials');
    } else {
      this.sharedDataService.showError('An unexpected error occurred.');
    }
  }
}
