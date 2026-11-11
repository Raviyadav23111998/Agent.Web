import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { SharedDataService } from '../../services/shared-data.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-reset-password',
  templateUrl: '../template/reset-password.component.html',
  styleUrl: '../style/reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  public resendOTP: boolean = false;
  public counter: number = 0;
  public IsEmailValidated: boolean = false;
  public UserCode: string = '';
  public OTP: string = '';

  public resetForm: FormGroup = new FormGroup({
    UserCode: new FormControl('', [Validators.required, Validators.maxLength(100)]),
    password: new FormControl('', [
      Validators.required,
      Validators.maxLength(100),
      Validators.minLength(6),
    ]),
    confirmpassword: new FormControl('', [Validators.required]),
  });

  constructor(
    private sharedDataService: SharedDataService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {}

  async onSubmit(val: string) {
    if (val === 'Next') {

      const data = {
        requestType: 'Challenge',
        userCode: this.UserCode
      };
      try {
        const res = await lastValueFrom(this.authService.changePassword(data));
        if (res.message === 'OTP Sent' || res.isSuccess) {
          this.IsEmailValidated = true;
          this.resendOTP = false;
          this.Timer();
        }
        this.sharedDataService.showInfo(res.message);
      } catch (e: any) {
        this.sharedDataService.showError(e?.error?.detail || e?.error?.message || 'Failed to send OTP');
      }
    } else if (val === 'Submit') {

      if (this.resetForm.value.password !== this.resetForm.value.confirmpassword) {
        this.sharedDataService.showError('Passwords do not match');
        return;
      }

      this.CreatePasscode();

      const data = {
        requestType: 'ForgotPassword',
        userCode: this.UserCode,
        password: this.resetForm.value.password,
        OTP: this.OTP
      };

      try {
        const res = await lastValueFrom(this.authService.changePassword(data));
        if (res) {
          this.sharedDataService.showInfo(res.message);
          if (res.message !== 'Invalid OTP' && res.isSuccess) {
            this.router.navigate(['/login']);
          }
        }
      } catch (e: any) {
        this.sharedDataService.showError(e?.error?.detail || e?.error?.message || 'Reset failed');
      }
    }
  }

  ResendCode() {
    this.onSubmit('Next');
  }

  keydown(event: KeyboardEvent, value: string) {
    if (event.key.length === 1 && /[a-zA-Z0-9]/.test(event.key)) {
      const nextIndex = parseInt(value) + 1;
      if (nextIndex <= 6) {
        setTimeout(() => {
          const next = document.getElementById('pincode-' + nextIndex);
          if (next) next.focus();
        }, 10);
      }
    }
  }

  keyup(event: KeyboardEvent, value: string) {
    if (event.key === 'Backspace') {
      const prevIndex = parseInt(value) - 1;
      if (prevIndex >= 1) {
        const prev = document.getElementById('pincode-' + prevIndex);
        if (prev) prev.focus();
      }
    }
  }

  CreatePasscode() {
    let otp = '';
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById('pincode-' + i) as HTMLInputElement;
      if (el) otp += el.value;
    }
    if (/^[A-Za-z0-9]{6}$/.test(otp)) {
      this.OTP = otp;
    } else {
      this.sharedDataService.showError('Please enter a valid 6-digit OTP');
    }
  }

  Timer() {
    this.counter = 60;
    const interval = setInterval(() => {
      this.counter--;
    }, 1000);
    setTimeout(() => {
      clearInterval(interval);
      this.resendOTP = true;
    }, 60000);
  }
}
