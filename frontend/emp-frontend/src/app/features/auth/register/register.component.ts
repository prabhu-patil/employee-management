import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <main class="min-h-screen bg-dark-bg px-4 py-8 text-white flex items-center justify-center">
      <section class="glass auth-card w-full max-w-md rounded-2xl border border-dark-border bg-dark-card/80 p-8 shadow-2xl shadow-black/30">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-dark-border bg-dark-surface">
            <svg class="h-7 w-7 text-dark-accent-light" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 21h18M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M9 7h3M9 11h3M9 15h3M16 9h1a2 2 0 0 1 2 2v10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
          <h1 class="text-3xl font-semibold tracking-normal">Create Account</h1>
          <p class="mt-2 text-sm text-dark-text-muted">Join AGENTLABS Employee Management System</p>
        </div>

        <form class="space-y-5" [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <label class="block">
            <span class="mb-2 block text-sm text-dark-text-muted">Full name</span>
            <input
              type="text"
              formControlName="full_name"
              autocomplete="name"
              class="h-12 w-full rounded-lg border border-dark-border bg-dark-surface px-4 text-white outline-none transition placeholder:text-dark-text-muted focus:border-dark-accent focus:ring-2 focus:ring-dark-accent/30"
              placeholder="Your full name"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm text-dark-text-muted">Email</span>
            <input
              type="email"
              formControlName="email"
              autocomplete="email"
              class="h-12 w-full rounded-lg border border-dark-border bg-dark-surface px-4 text-white outline-none transition placeholder:text-dark-text-muted focus:border-dark-accent focus:ring-2 focus:ring-dark-accent/30"
              placeholder="you@company.com"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm text-dark-text-muted">Password</span>
            <input
              type="password"
              formControlName="password"
              autocomplete="new-password"
              class="h-12 w-full rounded-lg border border-dark-border bg-dark-surface px-4 text-white outline-none transition placeholder:text-dark-text-muted focus:border-dark-accent focus:ring-2 focus:ring-dark-accent/30"
              placeholder="Enter password"
            />
          </label>

          <label class="block">
            <span class="mb-2 block text-sm text-dark-text-muted">Confirm password</span>
            <input
              type="password"
              formControlName="confirm_password"
              autocomplete="new-password"
              class="h-12 w-full rounded-lg border border-dark-border bg-dark-surface px-4 text-white outline-none transition placeholder:text-dark-text-muted focus:border-dark-accent focus:ring-2 focus:ring-dark-accent/30"
              placeholder="Re-enter your password"
            />
          </label>

          <div *ngIf="registerForm.hasError('passwordMismatch') && registerForm.get('confirm_password')?.touched" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Passwords do not match.
          </div>

          <div *ngIf="errorMessage" class="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            [disabled]="isLoading"
            class="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-dark-accent px-4 font-semibold text-white transition hover:bg-dark-accent-light disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span *ngIf="isLoading" class="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent"></span>
            <span>{{ isLoading ? 'Creating Account...' : 'Create Account' }}</span>
          </button>
        </form>

        <p class="mt-6 text-center text-sm text-dark-text-muted">
          Already have an account?
          <a routerLink="/login" class="font-semibold text-dark-accent-light hover:text-white">Sign in</a>
        </p>
      </section>
    </main>
  `,
})
export class RegisterComponent {
  registerForm: FormGroup;
  isLoading = false;
  errorMessage = '';

  constructor(
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.registerForm = this.formBuilder.group(
      {
        full_name: ['', [Validators.required, Validators.minLength(2)]],
        email: ['', [Validators.required, Validators.email]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirm_password: ['', Validators.required],
      },
      { validators: this.passwordsMatchValidator },
    );
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const { full_name, email, password } = this.registerForm.value;

    this.authService.register({ full_name, email, password }).subscribe({
      next: () => {
        this.router.navigate(['/login'], { queryParams: { registered: true } });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = this.getErrorMessage(error);
      },
    });
  }

  private passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirm_password')?.value;

    if (!password || !confirmPassword) {
      return null;
    }

    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  private getErrorMessage(error: any): string {
    const detail = error?.error?.detail;

    if (typeof detail === 'string') {
      return detail;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      return detail[0]?.msg ?? 'Unable to create account';
    }

    return error?.message ?? 'Unable to create account';
  }
}
