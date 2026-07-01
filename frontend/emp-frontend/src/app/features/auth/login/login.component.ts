import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

type LocationStatus = 'requesting' | 'granted' | 'denied' | 'ip-fallback';

type LocationData = {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
};

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <main class="login-page">
      <section class="login-card">
        <header class="brand-header">
          <div class="brand-line">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 20V8.5L12 4l8 4.5V20h-5v-6H9v6H4Z" /></svg>
            </span>
            <span>AGENT LABS</span>
          </div>
          <p>Sign in to your workspace</p>
          <div class="login-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              class="login-tab"
              [class.active]="loginType === 'employee'"
              [attr.aria-selected]="loginType === 'employee'"
              (click)="setLoginType('employee')"
            >Employee</button>
            <button
              type="button"
              role="tab"
              class="login-tab"
              [class.active]="loginType === 'admin'"
              [attr.aria-selected]="loginType === 'admin'"
              (click)="setLoginType('admin')"
            >Admin</button>
          </div>
          <div class="location-pill" [class.granted]="locationStatus === 'granted'" [class.fallback]="locationStatus === 'ip-fallback'" [class.requesting]="locationStatus === 'requesting'" [class.denied]="locationStatus === 'denied'">
            <span *ngIf="locationStatus === 'requesting'" class="mini-spinner"></span>
            <span *ngIf="locationStatus !== 'requesting'" class="status-dot"></span>
            <span>{{ locationLabel }}</span>
            <button *ngIf="locationStatus === 'denied'" type="button" (click)="requestLocation()">Retry</button>
          </div>
        </header>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form" autocomplete="on">
          <label>
            <span>Email</span>
            <input
              id="email"
              name="email"
              type="email"
              formControlName="email"
              autocomplete="username"
              placeholder="you@company.com"
            />
          </label>

          <label>
            <span>Password</span>
            <div class="password-field">
              <input
                id="password"
                name="password"
                [type]="showPassword ? 'text' : 'password'"
                formControlName="password"
                autocomplete="current-password"
                placeholder="Enter your password"
              />
              <button type="button" class="eye-button" (click)="showPassword = !showPassword" [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'">
                <svg *ngIf="!showPassword" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                </svg>
                <svg *ngIf="showPassword" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 3l18 18" />
                  <path d="M10.6 6.2A9.7 9.7 0 0 1 12 6c6 0 9.5 6 9.5 6a17.2 17.2 0 0 1-2.7 3.3M6.4 6.8C3.9 8.5 2.5 12 2.5 12s3.5 6 9.5 6c1.8 0 3.3-.5 4.6-1.2" />
                  <path d="M9.9 9.9A3 3 0 0 0 14.1 14.1" />
                </svg>
              </button>
            </div>
          </label>

          <div *ngIf="errorMessage" class="error-panel">{{ errorMessage }}</div>

          <button type="submit" class="submit-button" [disabled]="isLoading">
            <span *ngIf="isLoading" class="button-spinner"></span>
            <span>{{ isLoading ? 'Signing in...' : 'Sign In' }}</span>
          </button>
        </form>

        <div class="divider"><span>or</span></div>

        <button type="button" class="google-button" (click)="loginWithGoogle()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M21.6 12.23c0-.73-.07-1.43-.19-2.11H12v3.99h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z" />
            <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.36l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
            <path fill="#FBBC05" d="M6.4 13.96A6 6 0 0 1 6.08 12c0-.68.12-1.34.32-1.96V7.45H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.55l3.34-2.59Z" />
            <path fill="#EA4335" d="M12 5.92c1.47 0 2.78.5 3.82 1.5l2.87-2.87C16.95 2.93 14.7 2 12 2a10 10 0 0 0-8.94 5.45l3.34 2.59C7.19 7.68 9.4 5.92 12 5.92Z" />
          </svg>
          Continue with Google
        </button>

        <p class="register-copy">
          New to AGENT LABS?
          <a routerLink="/register">Create an account</a>
        </p>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      color: #111827;
    }

    .login-page {
      display: grid;
      min-height: 100vh;
      place-items: center;
      padding: 24px;
      background:
        radial-gradient(circle at 1px 1px, rgba(148, 163, 184, 0.18) 1px, transparent 0) 0 0 / 22px 22px,
        #F7F9FC;
    }

    .login-card {
      width: min(100%, 400px);
      padding: 40px;
      border: 1px solid #E5E7EB;
      border-radius: 20px;
      background: #FFFFFF;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.14);
    }

    .brand-header {
      text-align: center;
    }

    .brand-line {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: #111827;
      font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
      font-size: 20px;
      font-weight: 600;
      line-height: 1;
    }

    .brand-mark {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #2563EB;
      color: #FFFFFF;
    }

    .brand-mark svg {
      width: 19px;
      height: 19px;
      fill: currentColor;
    }

    .brand-header p {
      margin: 16px 0 0;
      color: #9CA3AF;
      font-size: 14px;
      line-height: 1.4;
    }

    .login-tabs {
      display: inline-flex;
      gap: 4px;
      margin-top: 18px;
      padding: 4px;
      border-radius: 12px;
      background: #F3F4F6;
    }

    .login-tab {
      min-width: 110px;
      height: 36px;
      padding: 0 18px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: #6B7280;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
    }

    .login-tab:hover:not(.active) {
      color: #374151;
    }

    .login-tab.active {
      background: #FFFFFF;
      color: #2563EB;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }

    .location-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 30px;
      margin-top: 16px;
      padding: 0 11px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
    }

    .location-pill.granted {
      background: #DCFCE7;
      color: #166534;
    }

    .location-pill.fallback {
      background: #FEF3C7;
      color: #92400E;
    }

    .location-pill.requesting,
    .location-pill.denied {
      background: #F3F4F6;
      color: #6B7280;
    }

    .location-pill button {
      border: 0;
      background: transparent;
      color: #2563EB;
      font: inherit;
      cursor: pointer;
      padding: 0;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: currentColor;
    }

    .mini-spinner,
    .button-spinner {
      border-radius: 999px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      animation: spin 800ms linear infinite;
    }

    .mini-spinner {
      width: 12px;
      height: 12px;
    }

    .login-form {
      display: grid;
      gap: 16px;
      margin-top: 28px;
    }

    label {
      display: grid;
      gap: 7px;
    }

    label > span {
      color: #374151;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.2;
    }

    input {
      width: 100%;
      height: 44px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #F9FAFB;
      color: #111827;
      font-size: 14px;
      outline: none;
      padding: 0 12px;
      transition: border-color 160ms ease, box-shadow 160ms ease, background-color 160ms ease;
    }

    input::placeholder {
      color: #9CA3AF;
    }

    input:focus {
      border-color: #2563EB;
      background: #FFFFFF;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    .password-field {
      position: relative;
    }

    .password-field input {
      padding-right: 44px;
    }

    .eye-button {
      position: absolute;
      top: 50%;
      right: 7px;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #9CA3AF;
      cursor: pointer;
      transform: translateY(-50%);
    }

    .eye-button:hover {
      background: #F3F4F6;
      color: #374151;
    }

    .eye-button svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .error-panel {
      border-left: 2px solid #DC2626;
      border-radius: 8px;
      background: #FEF2F2;
      color: #DC2626;
      font-size: 12px;
      line-height: 1.35;
      padding: 10px 12px;
      text-align: left;
    }

    .submit-button,
    .google-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 44px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 160ms ease, border-color 160ms ease, opacity 160ms ease;
    }

    .submit-button {
      gap: 8px;
      border: 0;
      background: #2563EB;
      color: #FFFFFF;
    }

    .submit-button:disabled {
      cursor: not-allowed;
      opacity: 0.68;
    }

    .button-spinner {
      width: 16px;
      height: 16px;
      color: #FFFFFF;
    }

    .divider {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 12px;
      margin: 22px 0;
      color: #D1D5DB;
      font-size: 12px;
      text-transform: lowercase;
    }

    .divider::before,
    .divider::after {
      height: 1px;
      background: #E5E7EB;
      content: '';
    }

    .google-button {
      gap: 10px;
      border: 1px solid #E5E7EB;
      background: #FFFFFF;
      color: #374151;
    }

    .google-button:hover {
      background: #F9FAFB;
    }

    .google-button svg {
      width: 18px;
      height: 18px;
    }

    .register-copy {
      margin: 24px 0 0;
      color: #9CA3AF;
      font-size: 13px;
      text-align: center;
    }

    .register-copy a {
      color: #2563EB;
      font-weight: 600;
      text-decoration: none;
    }

    .register-copy a:hover {
      text-decoration: underline;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 480px) {
      .login-page {
        padding: 16px;
      }

      .login-card {
        padding: 28px;
      }
    }
  `],
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  locationData: LocationData | null = null;
  locationStatus: LocationStatus = 'requesting';
  showPassword = false;
  loginType: 'employee' | 'admin' = 'employee';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
  ) {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.requestLocation();
  }

  get locationLabel(): string {
    if (this.locationStatus === 'granted') {
      return 'Location captured';
    }
    if (this.locationStatus === 'ip-fallback') {
      return 'IP location used';
    }
    if (this.locationStatus === 'denied') {
      return 'Location unavailable';
    }
    return 'Getting location...';
  }

  requestLocation(): void {
    this.locationStatus = 'requesting';

    if (!navigator.geolocation) {
      this.getIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locationData = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.locationStatus = 'granted';
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          this.locationData = null;
          this.locationStatus = 'denied';
          return;
        }

        this.getIPLocation();
      },
      {
        enableHighAccuracy: false,
        timeout: 4000,
        maximumAge: 300000,
      },
    );
  }

  getIPLocation(): void {
    this.http.get<any>(environment.ipGeoUrl).subscribe({
      next: (response) => {
        this.locationData = {
          lat: response.lat,
          lng: response.lon,
          city: response.city,
          country: response.country,
        };
        this.locationStatus = 'ip-fallback';
      },
      error: () => {
        this.locationData = null;
        this.locationStatus = 'denied';
      },
    });
  }

  setLoginType(type: 'employee' | 'admin'): void {
    this.loginType = type;
    this.errorMessage = '';
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService
      .login(
        email,
        password,
        this.locationData?.lat,
        this.locationData?.lng,
        this.locationData?.city,
        this.locationData?.country,
      )
      .subscribe({
        next: (response: any) => {
          const role = String(response?.role || '').toLowerCase();
          const isAdminRole = role === 'admin' || role === 'hr';

          if (this.loginType === 'admin' && !isAdminRole) {
            this.isLoading = false;
            this.errorMessage = 'This account is not an admin. Please use the Employee tab.';
            return;
          }
          if (this.loginType === 'employee' && isAdminRole) {
            this.isLoading = false;
            this.errorMessage = 'Admin accounts must sign in via the Admin tab.';
            return;
          }

          this.authService.setSession(response);
          window.location.href = '/dashboard';
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = this.getErrorMessage(error);
        },
      });
  }

  loginWithGoogle(): void {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  private getErrorMessage(error: any): string {
    const detail = error?.error?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg ?? 'Unable to sign in';
    }

    return error?.message ?? 'Unable to sign in';
  }
}
