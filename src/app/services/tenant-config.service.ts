import { Inject, Injectable } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TenantConfigService {

  private config: any = {
    orgName: 'Storeglance',
    logoUrl: '',
    email: '',
    phone: '',
    website: '',
    address: '',
    timezone: '',
    themeColor: '#1976d2',
    tenantStatus: 'active',
    subdomain: '',
  };

  private configLoaded = new BehaviorSubject<boolean>(false);
  public configLoaded$ = this.configLoaded.asObservable();
  private _configLoadFailed = false;

  get tenantInfo(): any { return this.config; }

  constructor(
    private http: HttpClient,
    @Inject(DOCUMENT) private document: Document,
  ) {}

  async loadConfig(): Promise<void> {
    try {
      const url = `${this.apiBase()}/TenantConfig`;
      const data: any = await this.http.get(url).toPromise();
      if (data) {
        this.config = { ...this.config, ...data };
        this.updatePageTitle();
        this.updateFavicon();
        this.updateThemeColor();
      }
      this._configLoadFailed = false;
    } catch (error) {
      console.warn('Failed to load tenant config, using defaults:', error);
      this._configLoadFailed = true;
    } finally {
      this.configLoaded.next(true);
    }
  }

  async loadTenantConfig(): Promise<void> { return this.loadConfig(); }

  isConfigLoadFailed(): boolean { return this._configLoadFailed; }

  getOrgName(): string { return this.config.orgName || ''; }

  hasLogo(): boolean { return !!this.config.logoUrl; }

  getInitial(): string {
    return ((this.config.orgName || 'A').trim().charAt(0) || 'A').toUpperCase();
  }

  getLogoUrl(): string {
    if (this.config.logoUrl) {

      return `${this.apiBase()}/TenantLogo`;
    }
    return 'assets/images/LOGO.png?v=sg1';
  }

  // Branding is served by the Agent API itself (standalone — no MSystem master).
  private apiBase(): string {
    return environment.apiUrl;
  }

  getThemeColor(): string { return this.config.themeColor || '#1976d2'; }
  getAddress(): string { return this.config.address || ''; }
  getPhone(): string { return this.config.phone || ''; }
  getEmail(): string { return this.config.email || ''; }
  getWebsite(): string { return this.config.website || ''; }
  getConfig(): any { return { ...this.config }; }

  getTenantStatus(): string { return this.config.tenantStatus || 'active'; }
  isTenantActive(): boolean { return this.getTenantStatus() === 'active'; }

  getTenantStatusMessage(): string {
    switch (this.getTenantStatus()) {
      case 'inactive':  return 'This account has been deactivated. Please contact your administrator.';
      case 'suspended': return 'This account has been suspended. Please contact support for assistance.';
      case 'expired':   return 'This subscription has expired. Please renew to continue.';
      default:          return '';
    }
  }

  private updatePageTitle(): void {
    if (this.config.orgName) { this.document.title = this.config.orgName; }
  }

  private updateFavicon(): void {
    if (this.config.logoUrl) {
      const link: HTMLLinkElement =
        this.document.querySelector("link[rel*='icon']") ||
        this.document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'icon';
      link.href = `${this.apiBase()}/TenantLogo`;
      this.document.head.appendChild(link);
    }
  }

  private hexToRgb(hex: string): string {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return `${(bigint >> 16) & 255}, ${(bigint >> 8) & 255}, ${bigint & 255}`;
  }

  private updateThemeColor(): void {
    const color = this.config.themeColor || '#1976d2';
    const rgb = this.hexToRgb(color);

    const meta: HTMLMetaElement =
      this.document.querySelector("meta[name='theme-color']") ||
      this.document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    this.document.head.appendChild(meta);

    let styleTag: HTMLStyleElement | null = this.document.querySelector('#tenant-theme');
    if (!styleTag) {
      styleTag = this.document.createElement('style');
      styleTag.id = 'tenant-theme';
      this.document.head.appendChild(styleTag);
    }
    styleTag.innerHTML = `
      :root {
        --kendo-color-primary: ${color} !important;
        --kendo-color-primary-rgb: ${rgb} !important;
        --kendo-color-primary-hover: ${color}cc !important;
        --bs-primary: ${color} !important;
        --bs-primary-rgb: ${rgb} !important;
        --primary-color: ${color} !important;
        --brand-primary: ${color} !important;
      }
    `;
  }
}
