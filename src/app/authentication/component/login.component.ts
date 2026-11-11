import { environment } from '../../../environments/environment';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SharedDataService } from '../../services/shared-data.service';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { lastValueFrom } from 'rxjs';
import { LanguageDataService } from '../../services/language-data.service';
import { CookieService } from 'ngx-cookie-service';
import { MSALService } from '../../services/msal.service';
import { GoogleAuthService } from '../../services/gapi.service';
import { NotificationService } from '../../services/notification.service';
import { TenantConfigService } from '../../services/tenant-config.service';

@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: '../template/login.component.html',
  styleUrl: '../style/login.component.scss'
})
export class LoginComponent implements OnInit {
  Language: any;
  public loginForm: FormGroup = new FormGroup({
    userId: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    password: new FormControl('', [Validators.required, Validators.maxLength(100)]),
  });

  selectedLanguage: string = 'en';
  public LanguageDDL: Array<{ text: string, value: string }> = [
    { text: "English", value: 'en' },
    { text: "Hindi", value: 'hi' }
  ];

  isLoading = false;
  showPassword = false;

  constructor(
    private languageDataService: LanguageDataService,
    private sharedDataService: SharedDataService,
    private cookieService: CookieService,
    private router: Router,
    private route: ActivatedRoute,
    private msalService: MSALService,
    private authService: AuthService,
    private googleAuthService: GoogleAuthService,
    private pushNotificationService: NotificationService,
    public tenantConfig: TenantConfigService
  ) {
    const prefLang = cookieService.get('PreferredLang');
    this.selectedLanguage = (prefLang && prefLang !== '') ? prefLang : 'en';

    if (!prefLang) {
      this.sharedDataService.SetPrefferedLanguage(this.selectedLanguage);
    }
  }

  async ngOnInit() {
    this.loadLanguage();
    await this.tenantConfig.loadTenantConfig();

    const msalToken = this.msEnabled ? await this.msalService.handleRedirect() : null;

    if (msalToken) {

      window.history.replaceState({}, document.title, window.location.pathname);
      await this.authService.login_External_Client('Microsoft', msalToken as string);
    } else {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get('access_token');

      if (accessToken) {

        window.history.replaceState({}, document.title, window.location.pathname);
        await this.authService.login_External_Client('Google', accessToken);
      }
    }

    const isAddingAccount = this.route.snapshot.queryParams['add_account'];

    if (this.authService.isAuthenticated() && !isAddingAccount) {
      this.sharedDataService.isLoggedIn = true;
      this.Navigate();
    } else {
      this.sharedDataService.isLoggedIn = false;
    }
  }

  async loadLanguage() {
    try {
      const loginLangData = await lastValueFrom(this.languageDataService.getLoginLanguage());
      this.Language = (loginLangData as any)['Login'];
      const msgLangData = await lastValueFrom(this.languageDataService.getMessageLanguage());
      const msgLang = (msgLangData as any)['Message'];
      this.Language = { ...this.Language, ...msgLang };
    } catch (e) {
      console.error('Failed to load language', e);
    }
  }

  switchLanguage(event: any) {
    this.selectedLanguage = event.target.value;
    this.sharedDataService.SetPrefferedLanguage(this.selectedLanguage);
    this.loadLanguage();
  }

  async onSubmit() {
    if (!this.loginForm.valid) {
      this.loginForm.markAllAsTouched();
      this.sharedDataService.showError(this.Language?.invalid_credentials || 'Please enter valid credentials');
      return;
    }

    this.isLoading = true;

    try {
      const AuthResponse: boolean = await this.authService.login_Client_Credentials(
        this.loginForm.value.userId,
        this.loginForm.value.password
      );

      if (AuthResponse) {
        this.sharedDataService.isLoggedIn = true;

        this.Navigate();
      }
    } catch (e) {
      console.error(e);
    } finally {
      this.isLoading = false;
    }
  }

  get msEnabled(): boolean { return !!environment.msalClientId; }
  get googleEnabled(): boolean { return !!environment.googleClientId; }

  async MicrosoftLogin() {
    await this.msalService.login();
  }

  async googleLogin() {
    await this.googleAuthService.oauthSignIn();
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  Navigate() {
    const USER = this.authService.parseJWT();
    if (!USER) return;

    this.router.navigate(['chat']);
  }

  goToAndroidStore() {
    window.location.href = window.location.origin + "/app/mobile-app.apk?dl=" + Date.now();
  }

  goToAppleStore() {
    window.location.href = window.location.origin + "/app/mobile-app.ipa?dl=" + Date.now();
  }
}
