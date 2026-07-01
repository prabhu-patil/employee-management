import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { EmployeeListItem, EmployeeService } from '../../core/services/employee.service';
import { resolveAvatarUrl } from '../../core/utils/avatar.util';

@Component({
  selector: 'app-employee-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <main class="page">
      <header class="page-head">
        <p class="eyebrow">Attendance</p>
        <h1>{{ greeting }}, All</h1>
      </header>

      <div class="dir-toolbar">
        <label class="dir-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
          <input type="text" placeholder="Search employees" [(ngModel)]="query" />
        </label>
        <p class="dir-count">{{ filtered.length }} employees</p>
      </div>

      <div class="dir-card">
        <div *ngIf="loading" class="grid-loading">Loading employees…</div>
        <div *ngIf="!loading && filtered.length === 0" class="grid-empty">No employees found.</div>

        <div *ngIf="!loading && filtered.length > 0" class="dir-scroll">
          <table class="dir-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let emp of filtered" class="dir-row" (click)="open(emp)">
                <td>
                  <div class="dir-emp">
                    <img *ngIf="emp.avatar_url" [src]="avatarSrc(emp.avatar_url)" [alt]="emp.full_name" />
                    <span *ngIf="!emp.avatar_url" class="dir-avatar">{{ getInitials(emp.full_name) }}</span>
                    <div>
                      <p class="dir-name">{{ emp.full_name }}</p>
                      <p class="dir-email">{{ emp.email }}</p>
                    </div>
                  </div>
                </td>
                <td>{{ emp.employee_id || '-' }}</td>
                <td>{{ emp.department_name || 'Unassigned' }}</td>
                <td><span class="dir-badge" [attr.data-role]="emp.role">{{ emp.role }}</span></td>
                <td><span class="dir-badge" [attr.data-status]="emp.is_active ? 'active' : 'inactive'">{{ emp.is_active ? 'Active' : 'Inactive' }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; color: #111827; }

    .page {
      min-height: 100vh;
      padding: 24px;
      background: #F7F9FC;
    }

    .page-head { margin-bottom: 16px; }
    .eyebrow {
      margin: 0;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    .page-head h1 {
      margin: 4px 0 12px;
      color: #111827;
      font-size: 22px;
      font-weight: 700;
    }
    .page-head h2 {
      margin: 0;
      color: #111827;
      font-size: 16px;
      font-weight: 600;
    }

    .dir-toolbar {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .dir-search {
      position: relative;
      flex: 1 1 320px;
    }

    .dir-search svg {
      position: absolute;
      top: 50%;
      left: 12px;
      width: 16px;
      height: 16px;
      fill: none;
      stroke: #9CA3AF;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
      transform: translateY(-50%);
    }

    .dir-search input {
      width: 100%;
      height: 38px;
      padding: 0 12px 0 36px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #FFFFFF;
      color: #111827;
      font-size: 13px;
      outline: none;
    }

    .dir-search input:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    .dir-count {
      margin: 0;
      color: #9CA3AF;
      font-size: 12px;
    }

    .dir-card {
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }

    .grid-loading,
    .grid-empty {
      padding: 24px;
      color: #6B7280;
      font-size: 13px;
      text-align: center;
    }

    .dir-scroll { overflow-x: auto; }

    .dir-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 820px;
    }

    .dir-table thead tr { background: #F9FAFB; }

    .dir-table th {
      padding: 11px 16px;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-align: left;
      text-transform: uppercase;
    }

    .dir-table td {
      padding: 13px 16px;
      border-bottom: 1px solid #F9FAFB;
      color: #4B5563;
      font-size: 13px;
    }

    .dir-row {
      cursor: pointer;
      transition: background-color 160ms ease, box-shadow 160ms ease;
    }

    .dir-row:nth-child(odd) { background: #FFFFFF; }
    .dir-row:nth-child(even) { background: #FAFAFA; }
    .dir-row:hover {
      background: #F5F9FF;
      box-shadow: inset 2px 0 0 #2563EB;
    }

    .dir-emp {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .dir-emp img,
    .dir-avatar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      object-fit: cover;
    }

    .dir-avatar {
      display: grid;
      place-items: center;
      background: #DBEAFE;
      color: #2563EB;
      font-size: 12px;
      font-weight: 700;
    }

    .dir-name {
      margin: 0;
      color: #111827;
      font-size: 13px;
      font-weight: 500;
    }

    .dir-email {
      margin: 3px 0 0;
      color: #9CA3AF;
      font-size: 11px;
    }

    .dir-badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 0 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
      background: #F3F4F6;
      color: #374151;
    }

    .dir-badge[data-role="admin"] { background: #FEE2E2; color: #991B1B; }
    .dir-badge[data-role="hr"] { background: #DBEAFE; color: #1D4ED8; }
    .dir-badge[data-role="manager"] { background: #E0F2FE; color: #0369A1; }
    .dir-badge[data-status="active"] { background: #DCFCE7; color: #166534; }
    .dir-badge[data-status="inactive"] { background: #FEE2E2; color: #991B1B; }
  `],
})
export class EmployeeAttendanceListComponent implements OnInit {
  employees: EmployeeListItem[] = [];
  loading = true;
  query = '';
  greeting = 'Good Day';
  displayRole = 'User';

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const hour = new Date().getHours();
    this.greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';

    const user = this.authService.getCurrentUser?.();
    const role = (user?.role || localStorage.getItem('user_role') || 'user').toLowerCase();
    this.displayRole = role.charAt(0).toUpperCase() + role.slice(1);

    this.employeeService.getAll().subscribe({
      next: (list) => {
        this.employees = list || [];
        this.loading = false;
      },
      error: () => {
        this.employees = [];
        this.loading = false;
      },
    });
  }

  get filtered(): EmployeeListItem[] {
    const q = (this.query || '').trim().toLowerCase();
    if (!q) return this.employees;
    return this.employees.filter((e) =>
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.employee_id || '').toLowerCase().includes(q),
    );
  }

  open(emp: EmployeeListItem): void {
    this.router.navigate(['/attendance/employee', emp.id]);
  }

  avatarSrc(url: string | undefined | null): string {
    return resolveAvatarUrl(url);
  }

  getInitials(name: string | undefined): string {
    const parts = (name || 'User').trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0)).join('').toUpperCase();
  }
}
