import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { switchMap, of } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { resolveAvatarUrl } from '../../../core/utils/avatar.util';

type ProfileTab = 'about' | 'settings';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePipe, TitleCasePipe],
  template: `
    <main class="profile-page">
      <button type="button" class="back-btn" aria-label="Back" (click)="goBack()">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
        <span>Back</span>
      </button>

      <header class="breadcrumb">
        <h1>Profile</h1>
        <nav>
          <a routerLink="/employees">Employees</a>
          <span class="sep">›</span>
          <span class="current">Employee Profile</span>
        </nav>
      </header>

      <section *ngIf="isLoading" class="loading">Loading profile…</section>
      <section *ngIf="!isLoading && errorMessage" class="error">{{ errorMessage }}</section>

      <section *ngIf="!isLoading && !errorMessage && employee" class="layout">
        <aside class="side-card">
          <div class="avatar-wrap" (click)="fileInput.click()" role="button" tabindex="0" [attr.aria-label]="'Change profile picture'">
            <img *ngIf="employee.avatar_url" [src]="avatarSrc(employee.avatar_url)" [alt]="employee.full_name" />
            <span *ngIf="!employee.avatar_url" class="avatar-initials">{{ getInitials(employee.full_name) }}</span>
            <span class="avatar-overlay">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>{{ isUploadingAvatar ? 'Uploading…' : 'Change' }}</span>
            </span>
          </div>
          <input
            #fileInput
            type="file"
            accept="image/png,image/jpeg"
            hidden
            (change)="onAvatarSelected($event)"
          />
          <div *ngIf="avatarError" class="notice error avatar-msg">{{ avatarError }}</div>
          <h2 class="name">{{ employee.full_name }}</h2>
          <p class="role">{{ employee.role | titlecase }}</p>
          <p class="dept" *ngIf="employee.department_name">{{ employee.department_name }}</p>

          <ul class="contact">
            <li>
              <span class="lbl">Mobile</span>
              <span class="val">{{ employee.phone || '—' }}</span>
            </li>
            <li>
              <span class="lbl">Email</span>
              <span class="val">{{ employee.email }}</span>
            </li>
            <li>
              <span class="lbl">Employee ID</span>
              <span class="val">{{ employee.employee_id || '—' }}</span>
            </li>
            <li>
              <span class="lbl">Status</span>
              <span class="val" [class.active]="employee.is_active" [class.inactive]="!employee.is_active">
                {{ employee.is_active ? 'Active' : 'Inactive' }}
              </span>
            </li>
          </ul>
        </aside>

        <article class="main-card">
          <nav class="tabs">
            <button type="button" [class.active]="activeTab === 'about'" (click)="activeTab = 'about'">About Me</button>
            <button type="button" [class.active]="activeTab === 'settings'" (click)="activeTab = 'settings'">Settings</button>
          </nav>

          <section *ngIf="activeTab === 'about'" class="tab-body">
            <div class="grid two-col">
              <div class="field">
                <span class="field-label">Full Name</span>
                <span class="field-value">{{ employee.full_name }}</span>
              </div>
              <div class="field">
                <span class="field-label">Email</span>
                <span class="field-value">{{ employee.email }}</span>
              </div>
              <div class="field">
                <span class="field-label">Phone</span>
                <span class="field-value">{{ employee.phone || '—' }}</span>
              </div>
              <div class="field">
                <span class="field-label">Role</span>
                <span class="field-value">{{ employee.role | titlecase }}</span>
              </div>
              <div class="field">
                <span class="field-label">Department</span>
                <span class="field-value">{{ employee.department_name || 'Unassigned' }}</span>
              </div>
              <div class="field">
                <span class="field-label">Manager</span>
                <span class="field-value">{{ employee.manager_name || '—' }}</span>
              </div>
              <div class="field">
                <span class="field-label">Employee ID</span>
                <span class="field-value">{{ employee.employee_id || '—' }}</span>
              </div>
              <div class="field">
                <span class="field-label">Joined On</span>
                <span class="field-value">{{ employee.created_at | date:'mediumDate' }}</span>
              </div>
            </div>
          </section>

          <section *ngIf="activeTab === 'settings'" class="tab-body">
            <div *ngIf="saveSuccess" class="notice success">{{ saveSuccess }}</div>
            <div *ngIf="saveError" class="notice error">{{ saveError }}</div>

            <form [formGroup]="editForm" (ngSubmit)="onSave()" class="settings-form">
              <div class="grid two-col">
                <label class="form-field">
                  <span class="field-label">Full Name</span>
                  <input type="text" formControlName="full_name" placeholder="Enter full name" />
                </label>

                <label class="form-field">
                  <span class="field-label">Email</span>
                  <input type="email" [value]="employee.email" disabled />
                  <small class="hint">Email cannot be changed</small>
                </label>

                <label class="form-field">
                  <span class="field-label">Phone</span>
                  <input type="text" formControlName="phone" placeholder="Phone number" />
                </label>

                <label class="form-field">
                  <span class="field-label">Role</span>
                  <select formControlName="role">
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <label class="form-field">
                  <span class="field-label">Department</span>
                  <select formControlName="department_id">
                    <option value="">Unassigned</option>
                    <option *ngFor="let dept of departments" [value]="dept.id">{{ dept.name }}</option>
                  </select>
                </label>

                <label class="form-field">
                  <span class="field-label">Status</span>
                  <select formControlName="is_active">
                    <option [ngValue]="true">Active</option>
                    <option [ngValue]="false">Inactive</option>
                  </select>
                </label>

                <label class="form-field">
                  <span class="field-label">Employee ID</span>
                  <input type="text" [value]="employee.employee_id || ''" disabled />
                  <small class="hint">Generated automatically</small>
                </label>

                <label class="form-field">
                  <span class="field-label">Joined On</span>
                  <input type="text" [value]="(employee.created_at | date:'mediumDate') || ''" disabled />
                </label>
              </div>

              <footer class="form-actions">
                <button type="button" class="secondary" (click)="resetForm()" [disabled]="isSaving">Reset</button>
                <button type="submit" class="primary" [disabled]="editForm.invalid || isSaving">
                  {{ isSaving ? 'Saving…' : 'Save Changes' }}
                </button>
              </footer>
            </form>
          </section>
        </article>
      </section>
    </main>
  `,
  styles: [`
    :host { display: block; color: #111827; }

    .profile-page {
      min-height: 100vh;
      padding: 24px;
      background: #F7F9FC;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
      padding: 6px 12px 6px 8px;
      width: fit-content;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #FFFFFF;
      color: #374151;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 160ms ease, border-color 160ms ease;
    }

    .back-btn:hover {
      background: #F9FAFB;
      border-color: #2563EB;
      color: #2563EB;
    }

    .back-btn svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
    }

    .breadcrumb h1 {
      margin: 0;
      color: #111827;
      font-size: 18px;
      font-weight: 600;
    }

    .breadcrumb nav {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: #6B7280;
      font-size: 13px;
    }

    .breadcrumb a {
      color: #2563EB;
      text-decoration: none;
    }

    .breadcrumb .sep { color: #D1D5DB; }
    .breadcrumb .current { color: #111827; font-weight: 500; }

    .loading,
    .error {
      padding: 24px;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      color: #6B7280;
      font-size: 14px;
    }

    .error { background: #FEE2E2; color: #991B1B; }

    .layout {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 18px;
      align-items: start;
    }

    .side-card,
    .main-card {
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .side-card {
      padding: 24px 20px;
      text-align: center;
    }

    .avatar-wrap {
      position: relative;
      display: grid;
      place-items: center;
      width: 120px;
      height: 120px;
      margin: 0 auto 14px;
      border-radius: 999px;
      background: #DBEAFE;
      color: #1D4ED8;
      font-size: 32px;
      font-weight: 700;
      overflow: hidden;
      cursor: pointer;
    }

    .avatar-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      background: rgba(15, 23, 42, 0.55);
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      opacity: 0;
      transition: opacity 160ms ease;
    }

    .avatar-wrap:hover .avatar-overlay,
    .avatar-wrap:focus-visible .avatar-overlay {
      opacity: 1;
    }

    .avatar-overlay svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .avatar-msg {
      margin: -4px 0 12px;
    }

    .side-card .name {
      margin: 0;
      color: #111827;
      font-size: 18px;
      font-weight: 600;
    }

    .side-card .role {
      margin: 4px 0 0;
      color: #2563EB;
      font-size: 13px;
      font-weight: 600;
      text-transform: capitalize;
    }

    .side-card .dept {
      margin: 4px 0 0;
      color: #6B7280;
      font-size: 12px;
    }

    .contact {
      margin: 20px 0 0;
      padding: 0;
      list-style: none;
      text-align: left;
    }

    .contact li {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #F3F4F6;
      gap: 12px;
    }

    .contact li:last-child { border-bottom: 0; }

    .contact .lbl {
      color: #9CA3AF;
      font-size: 12px;
      font-weight: 500;
    }

    .contact .val {
      color: #111827;
      font-size: 13px;
      font-weight: 500;
      max-width: 60%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .contact .val.active { color: #166534; }
    .contact .val.inactive { color: #991B1B; }

    .tabs {
      display: flex;
      border-bottom: 1px solid #E5E7EB;
    }

    .tabs button {
      flex: 1;
      min-height: 48px;
      border: 0;
      background: transparent;
      color: #6B7280;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }

    .tabs button.active {
      color: #2563EB;
      border-bottom-color: #2563EB;
      background: #F5F9FF;
    }

    .tab-body {
      padding: 24px;
    }

    .grid.two-col {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 18px 24px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .field-label {
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .field-value {
      color: #111827;
      font-size: 14px;
      font-weight: 500;
      word-break: break-word;
    }

    .settings-form {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .form-field input,
    .form-field select {
      height: 38px;
      padding: 0 12px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #FFFFFF;
      color: #111827;
      font-size: 13px;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
      font-family: inherit;
    }

    .form-field input:focus,
    .form-field select:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    .form-field input:disabled,
    .form-field select:disabled {
      background: #F3F4F6;
      color: #6B7280;
      cursor: not-allowed;
    }

    .form-field .hint {
      color: #9CA3AF;
      font-size: 11px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 6px;
      border-top: 1px solid #F3F4F6;
      margin-top: 6px;
    }

    .form-actions button {
      min-height: 38px;
      min-width: 110px;
      padding: 0 16px;
      border: 0;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }

    .form-actions .primary {
      background: #2563EB;
      color: #FFFFFF;
    }

    .form-actions .primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .form-actions .secondary {
      background: #F3F4F6;
      color: #374151;
    }

    .notice {
      margin-bottom: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
    }

    .notice.success { background: #DCFCE7; color: #166534; }
    .notice.error { background: #FEE2E2; color: #991B1B; }

    @media (max-width: 900px) {
      .layout {
        grid-template-columns: 1fr;
      }
      .grid.two-col {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class EmployeeProfileComponent implements OnInit {
  employee: any = null;
  isLoading = true;
  errorMessage = '';
  activeTab: ProfileTab = 'about';

  editForm: FormGroup;
  departments: any[] = [];
  isSaving = false;
  saveSuccess = '';
  saveError = '';

  isUploadingAvatar = false;
  avatarError = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private authService: AuthService,
    private fb: FormBuilder,
  ) {
    this.editForm = this.fb.group({
      full_name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      role: ['employee', Validators.required],
      department_id: [''],
      is_active: [true, Validators.required],
    });
  }

  ngOnInit(): void {
    this.employeeService.getDepartments().subscribe({
      next: (depts) => (this.departments = depts || []),
      error: () => (this.departments = []),
    });

    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            return of(null);
          }
          return id === 'me'
            ? this.employeeService.getMyProfile()
            : this.employeeService.getById(id);
        }),
      )
      .subscribe({
        next: (data) => {
          this.employee = data;
          this.isLoading = false;
          if (!data) {
            this.errorMessage = 'Profile not found';
          } else {
            this.patchFormFromEmployee();
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = this.extractError(err, 'Failed to load profile');
        },
      });
  }

  private patchFormFromEmployee(): void {
    if (!this.employee) return;
    this.editForm.patchValue({
      full_name: this.employee.full_name || '',
      phone: this.employee.phone || '',
      role: this.employee.role || 'employee',
      department_id: this.employee.department_id || '',
      is_active: this.employee.is_active ?? true,
    });
  }

  resetForm(): void {
    this.saveSuccess = '';
    this.saveError = '';
    this.patchFormFromEmployee();
  }

  onSave(): void {
    if (this.editForm.invalid || !this.employee?.id) {
      return;
    }
    this.isSaving = true;
    this.saveSuccess = '';
    this.saveError = '';

    const payload: any = {
      full_name: this.editForm.value.full_name,
      phone: this.editForm.value.phone || undefined,
      role: this.editForm.value.role,
      is_active: this.editForm.value.is_active,
    };

    this.employeeService.update(this.employee.id, payload).subscribe({
      next: (updated) => {
        this.employee = updated;
        this.patchFormFromEmployee();
        this.isSaving = false;
        this.saveSuccess = 'Profile updated successfully';
        setTimeout(() => (this.saveSuccess = ''), 3000);
        this.syncCurrentUserIfSelf(updated);
      },
      error: (err) => {
        this.isSaving = false;
        this.saveError = this.extractError(err, 'Failed to update profile');
      },
    });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.employee?.id) {
      return;
    }

    this.avatarError = '';

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      this.avatarError = 'Avatar must be a JPEG or PNG image';
      input.value = '';
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      this.avatarError = 'Avatar must be under 2MB';
      input.value = '';
      return;
    }

    this.isUploadingAvatar = true;
    this.employeeService.uploadAvatar(this.employee.id, file).subscribe({
      next: (updated) => {
        this.employee = updated;
        this.isUploadingAvatar = false;
        input.value = '';
        this.syncCurrentUserIfSelf(updated);
      },
      error: (err) => {
        this.isUploadingAvatar = false;
        this.avatarError = this.extractError(err, 'Failed to upload avatar');
        input.value = '';
      },
    });
  }

  private syncCurrentUserIfSelf(updated: any): void {
    const myId = localStorage.getItem('user_id');
    if (!myId || !updated?.id) return;
    if (String(myId) === String(updated.id)) {
      this.authService.updateCurrentUser({
        full_name: updated.full_name,
        avatar_url: updated.avatar_url,
        role: updated.role,
      });
    }
  }

  private extractError(err: any, fallback: string): string {
    const detail = err?.error?.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0];
      if (typeof first === 'string') return first;
      if (first?.msg) return first.msg;
    }
    if (detail && typeof detail === 'object' && (detail as any).msg) {
      return (detail as any).msg;
    }
    if (typeof err?.error?.message === 'string') return err.error.message;
    if (typeof err?.message === 'string') return err.message;
    return fallback;
  }

  goBack(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'me') {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/employees']);
    }
  }

  getInitials(name: string | undefined): string {
    const parts = (name || 'User').trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0)).join('').toUpperCase();
  }

  avatarSrc(url: string | undefined | null): string {
    return resolveAvatarUrl(url);
  }
}
