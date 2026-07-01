import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { listAnimation } from '../../core/animations/list.animations';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeListItem, EmployeeService } from '../../core/services/employee.service';
import { resolveAvatarUrl } from '../../core/utils/avatar.util';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

type ViewMode = 'table' | 'grid';

@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, EmptyStateComponent, ConfirmDialogComponent],
  animations: [listAnimation],
  template: `
    <main class="employees-page">
      <section class="page-header">
        <div>
          <h1>Employee Directory</h1>
          <p>Search, filter, and manage employee records.</p>
        </div>
        <button *ngIf="canManage" type="button" class="add-button" (click)="openCreateModal()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
          Add Employee
        </button>
      </section>

      <section class="filter-bar">
        <label class="search-field">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
          <input
            type="text"
            placeholder="Search employees"
            [(ngModel)]="searchQuery"
            (ngModelChange)="applyFilters()"
          />
        </label>

        <select [(ngModel)]="selectedDepartment" (ngModelChange)="applyFilters()" aria-label="Filter by department">
          <option value="">All Departments</option>
          <option *ngFor="let dept of departments" [value]="dept.id || dept.name">{{ dept.name }}</option>
        </select>

        <select [(ngModel)]="selectedRole" (ngModelChange)="applyFilters()" aria-label="Filter by role">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="hr">HR</option>
          <option value="manager">Manager</option>
          <option value="employee">Employee</option>
        </select>

        <div class="view-toggle" aria-label="View mode">
          <button type="button" [class.active]="viewMode === 'table'" (click)="viewMode = 'table'" aria-label="Table view">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <button type="button" [class.active]="viewMode === 'grid'" (click)="viewMode = 'grid'" aria-label="Grid view">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z" /></svg>
          </button>
        </div>
      </section>

      <p class="result-count">Showing {{ filteredEmployees.length }} of {{ employees.length }} employees</p>

      <div *ngIf="successMessage" class="notice success">{{ successMessage }}</div>
      <div *ngIf="errorMessage" class="notice error">{{ errorMessage }}</div>

      <section *ngIf="viewMode === 'table'" class="employee-table-card">
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Employee ID</th>
                <th>Department</th>
                <th>Role</th>
                <th>Status</th>
                <th *ngIf="canManage">Actions</th>
              </tr>
            </thead>
            <tbody *ngIf="isLoading || (!isLoading && filteredEmployees.length === 0)">
              <tr *ngIf="isLoading">
                <td [attr.colspan]="canManage ? 6 : 5">
                  <div class="skeleton loading-line"></div>
                </td>
              </tr>

              <tr *ngIf="!isLoading && filteredEmployees.length === 0">
                <td [attr.colspan]="canManage ? 6 : 5" class="empty-state">
                  <app-empty-state
                    [icon]="hasActiveFilters ? 'search' : 'users'"
                    title="No employees found"
                    [description]="hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'Add employees to start building your directory.'"
                    [actionLabel]="hasActiveFilters ? 'Clear filters' : undefined"
                    (actionClick)="clearFilters()">
                  </app-empty-state>
                </td>
              </tr>
            </tbody>

            <tbody *ngIf="!isLoading && animatedEmployees.length">
              <tr
                *ngFor="let emp of animatedEmployees"
                class="employee-row clickable"
                (click)="goToProfile(emp.id)"
              >
                <td>
                  <div class="employee-cell">
                    <img *ngIf="emp.avatar_url" [src]="avatarSrc(emp.avatar_url)" [alt]="emp.full_name" />
                    <span *ngIf="!emp.avatar_url" class="avatar">{{ getInitials(emp.full_name) }}</span>
                    <div>
                      <p class="employee-name">{{ emp.full_name }}</p>
                      <p class="employee-email">{{ emp.email }}</p>
                    </div>
                  </div>
                </td>
                <td>{{ emp.employee_id || '-' }}</td>
                <td>{{ emp.department_name || 'Unassigned' }}</td>
                <td><span [class]="getRoleBadgeClass(emp.role)">{{ emp.role }}</span></td>
                <td><span [class]="getStatusBadgeClass(emp.is_active)">{{ emp.is_active ? 'Active' : 'Inactive' }}</span></td>
                <td *ngIf="canManage" (click)="$event.stopPropagation()">
                  <div class="actions">
                    <button type="button" class="icon-button edit" aria-label="Edit employee" (click)="openEditModal(emp)">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                    </button>
                    <button *ngIf="currentUserRole === 'admin'" type="button" class="icon-button delete" aria-label="Deactivate employee" (click)="confirmDeactivateId = emp.id">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>

            <tbody *ngIf="!isLoading && instantEmployees.length">
              <tr
                *ngFor="let emp of instantEmployees"
                class="employee-row clickable"
                (click)="goToProfile(emp.id)"
              >
                <td>
                  <div class="employee-cell">
                    <img *ngIf="emp.avatar_url" [src]="avatarSrc(emp.avatar_url)" [alt]="emp.full_name" />
                    <span *ngIf="!emp.avatar_url" class="avatar">{{ getInitials(emp.full_name) }}</span>
                    <div>
                      <p class="employee-name">{{ emp.full_name }}</p>
                      <p class="employee-email">{{ emp.email }}</p>
                    </div>
                  </div>
                </td>
                <td>{{ emp.employee_id || '-' }}</td>
                <td>{{ emp.department_name || 'Unassigned' }}</td>
                <td><span [class]="getRoleBadgeClass(emp.role)">{{ emp.role }}</span></td>
                <td><span [class]="getStatusBadgeClass(emp.is_active)">{{ emp.is_active ? 'Active' : 'Inactive' }}</span></td>
                <td *ngIf="canManage" (click)="$event.stopPropagation()">
                  <div class="actions">
                    <button type="button" class="icon-button edit" aria-label="Edit employee" (click)="openEditModal(emp)">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
                    </button>
                    <button *ngIf="currentUserRole === 'admin'" type="button" class="icon-button delete" aria-label="Deactivate employee" (click)="confirmDeactivateId = emp.id">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" /></svg>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section *ngIf="viewMode === 'grid' && animatedEmployees.length" class="employee-grid">
        <article
          *ngFor="let emp of animatedEmployees"
          class="employee-card card-hover clickable"
          (click)="goToProfile(emp.id)"
        >
          <div class="card-top">
            <img *ngIf="emp.avatar_url" [src]="avatarSrc(emp.avatar_url)" [alt]="emp.full_name" />
            <span *ngIf="!emp.avatar_url" class="avatar large">{{ getInitials(emp.full_name) }}</span>
            <span [class]="getStatusBadgeClass(emp.is_active)">{{ emp.is_active ? 'Active' : 'Inactive' }}</span>
          </div>
          <h2>{{ emp.full_name }}</h2>
          <p>{{ emp.email }}</p>
          <div class="card-meta">
            <span>{{ emp.employee_id || '-' }}</span>
            <span>{{ emp.department_name || 'Unassigned' }}</span>
          </div>
          <div class="card-footer">
            <span [class]="getRoleBadgeClass(emp.role)">{{ emp.role }}</span>
            <div *ngIf="canManage" class="actions" (click)="$event.stopPropagation()">
              <button type="button" class="icon-button edit" aria-label="Edit employee" (click)="openEditModal(emp)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
              </button>
              <button *ngIf="currentUserRole === 'admin'" type="button" class="icon-button delete" aria-label="Deactivate employee" (click)="confirmDeactivateId = emp.id">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" /></svg>
              </button>
            </div>
          </div>
        </article>
      </section>

      <section *ngIf="viewMode === 'grid' && instantEmployees.length" class="employee-grid instant-grid">
        <article
          *ngFor="let emp of instantEmployees"
          class="employee-card card-hover clickable"
          (click)="goToProfile(emp.id)"
        >
          <div class="card-top">
            <img *ngIf="emp.avatar_url" [src]="avatarSrc(emp.avatar_url)" [alt]="emp.full_name" />
            <span *ngIf="!emp.avatar_url" class="avatar large">{{ getInitials(emp.full_name) }}</span>
            <span [class]="getStatusBadgeClass(emp.is_active)">{{ emp.is_active ? 'Active' : 'Inactive' }}</span>
          </div>
          <h2>{{ emp.full_name }}</h2>
          <p>{{ emp.email }}</p>
          <div class="card-meta">
            <span>{{ emp.employee_id || '-' }}</span>
            <span>{{ emp.department_name || 'Unassigned' }}</span>
          </div>
          <div class="card-footer">
            <span [class]="getRoleBadgeClass(emp.role)">{{ emp.role }}</span>
            <div *ngIf="canManage" class="actions" (click)="$event.stopPropagation()">
              <button type="button" class="icon-button edit" aria-label="Edit employee" (click)="openEditModal(emp)">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" /></svg>
              </button>
              <button *ngIf="currentUserRole === 'admin'" type="button" class="icon-button delete" aria-label="Deactivate employee" (click)="confirmDeactivateId = emp.id">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15M10 11v6M14 11v6" /></svg>
              </button>
            </div>
          </div>
        </article>
      </section>

      <section *ngIf="viewMode === 'grid' && !isLoading && filteredEmployees.length === 0" class="empty-panel">
        <app-empty-state
          [icon]="hasActiveFilters ? 'search' : 'users'"
          title="No employees found"
          [description]="hasActiveFilters ? 'Try adjusting your filters or search terms.' : 'Add employees to start building your directory.'"
          [actionLabel]="hasActiveFilters ? 'Clear filters' : undefined"
          (actionClick)="clearFilters()">
        </app-empty-state>
      </section>

      <div *ngIf="showCreateModal || showEditModal" class="modal-backdrop">
        <section class="modal-card">
          <header>
            <h2>{{ showCreateModal ? 'Add New Employee' : 'Edit Employee' }}</h2>
            <button type="button" aria-label="Close modal" (click)="closeModals()">×</button>
          </header>

          <form [formGroup]="showCreateModal ? createForm : editForm" (ngSubmit)="showCreateModal ? onCreateSubmit() : onEditSubmit()">
            <label>
              <span>Full Name</span>
              <input formControlName="full_name" type="text" />
            </label>

            <label *ngIf="showCreateModal">
              <span>Email</span>
              <input formControlName="email" type="email" />
            </label>

            <label *ngIf="showCreateModal">
              <span>Password</span>
              <input formControlName="password" type="password" />
            </label>

            <label>
              <span>Role</span>
              <select formControlName="role">
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="hr">HR</option>
                <option value="admin">Admin</option>
              </select>
            </label>

            <label>
              <span>Department</span>
              <select formControlName="department_id">
                <option value="">None</option>
                <option *ngFor="let dept of departments" [value]="dept.id">{{ dept.name }}</option>
              </select>
            </label>

            <label>
              <span>Phone</span>
              <input formControlName="phone" type="text" />
            </label>

            <footer>
              <button type="button" class="secondary-button" (click)="closeModals()">Cancel</button>
              <button type="submit" class="primary-button" [disabled]="(showCreateModal ? createForm.invalid : editForm.invalid) || isLoading">
                {{ showCreateModal ? (isLoading ? 'Creating...' : 'Create') : (isLoading ? 'Updating...' : 'Update') }}
              </button>
            </footer>
          </form>
        </section>
      </div>

      <app-confirm-dialog
        [open]="!!confirmDeactivateId"
        title="Deactivate employee?"
        [message]="'Are you sure you want to deactivate <strong>' + (pendingDeactivateName || 'this employee') + '</strong>? They will lose access until reactivated.'"
        confirmLabel="Deactivate"
        cancelLabel="Cancel"
        [danger]="true"
        (confirm)="onDeactivateConfirm()"
        (cancel)="confirmDeactivateId = null">
      </app-confirm-dialog>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      color: #111827;
    }

    .employees-page {
      min-height: 100vh;
      padding: 24px;
      background: #F7F9FC;
    }

    .page-header,
    .filter-bar {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 14px;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .page-header {
      justify-content: space-between;
      padding: 18px;
    }

    .page-header h1,
    .page-header p,
    .result-count,
    .employee-name,
    .employee-email,
    .employee-card h2,
    .employee-card p {
      margin: 0;
    }

    .page-header h1 {
      color: #111827;
      font-size: 20px;
      font-weight: 500;
      letter-spacing: 0;
    }

    .page-header p {
      margin-top: 5px;
      color: #9CA3AF;
      font-size: 13px;
    }

    .add-button,
    .primary-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 38px;
      border: 0;
      border-radius: 10px;
      background: #2563EB;
      color: #FFFFFF;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .add-button {
      padding: 0 14px;
      white-space: nowrap;
    }

    .add-button svg,
    .icon-button svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.9;
    }

    .filter-bar {
      padding: 12px;
    }

    .search-field {
      position: relative;
      flex: 1 1 320px;
      min-width: 220px;
    }

    .search-field svg {
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

    input,
    select {
      height: 38px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #F9FAFB;
      color: #111827;
      font-size: 13px;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .search-field input {
      width: 100%;
      padding: 0 12px 0 36px;
    }

    select {
      min-width: 160px;
      padding: 0 34px 0 12px;
    }

    input:focus,
    select:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    .view-toggle {
      display: inline-flex;
      gap: 4px;
      padding: 3px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #FFFFFF;
    }

    .view-toggle button {
      display: grid;
      place-items: center;
      width: 32px;
      height: 30px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #9CA3AF;
      cursor: pointer;
    }

    .view-toggle button.active {
      background: #EFF6FF;
      color: #2563EB;
    }

    .view-toggle svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .result-count {
      margin: 0 0 12px;
      color: #9CA3AF;
      font-size: 12px;
    }

    .notice {
      margin-bottom: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      font-size: 13px;
    }

    .notice.success {
      background: #DCFCE7;
      color: #166534;
    }

    .notice.error {
      background: #FEE2E2;
      color: #991B1B;
    }

    .employee-table-card {
      overflow: hidden;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .table-scroll {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 820px;
      border-collapse: collapse;
    }

    thead tr {
      background: #F9FAFB;
    }

    th {
      padding: 11px 16px;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-align: left;
      text-transform: uppercase;
    }

    td {
      padding: 13px 16px;
      border-bottom: 1px solid #F9FAFB;
      color: #4B5563;
      font-size: 13px;
    }

    .employee-row {
      transition: background-color 160ms ease, box-shadow 160ms ease;
    }

    .clickable {
      cursor: pointer;
    }

    .employee-row:nth-child(odd) {
      background: #FFFFFF;
    }

    .employee-row:nth-child(even) {
      background: #FAFAFA;
    }

    .employee-row:hover {
      background: #F5F9FF;
      box-shadow: inset 2px 0 0 #2563EB;
    }

    .employee-cell {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }

    .employee-cell img,
    .employee-card img {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      object-fit: cover;
    }

    .avatar {
      display: grid;
      flex: 0 0 34px;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #DBEAFE;
      color: #2563EB;
      font-size: 12px;
      font-weight: 700;
    }

    .avatar.large {
      width: 42px;
      height: 42px;
      font-size: 14px;
    }

    .employee-name {
      color: #111827;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.25;
    }

    .employee-email {
      margin-top: 3px;
      color: #9CA3AF;
      font-size: 11px;
      line-height: 1.2;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      padding: 0 8px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      line-height: 1;
      text-transform: capitalize;
    }

    .role-admin { background: #FEE2E2; color: #991B1B; }
    .role-hr { background: #DBEAFE; color: #1D4ED8; }
    .role-manager { background: #E0F2FE; color: #0369A1; }
    .role-employee { background: #F3F4F6; color: #374151; }
    .status-active { background: #DCFCE7; color: #166534; }
    .status-inactive { background: #FEE2E2; color: #991B1B; }

    .actions,
    .confirm-actions {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .icon-button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      cursor: pointer;
    }

    .icon-button.edit {
      color: #9CA3AF;
    }

    .icon-button.edit:hover {
      background: #F3F4F6;
      color: #374151;
    }

    .icon-button.delete {
      color: #FCA5A5;
    }

    .icon-button.delete:hover {
      background: #FEE2E2;
      color: #DC2626;
    }

    .danger-button,
    .ghost-button,
    .secondary-button {
      min-height: 30px;
      border: 0;
      border-radius: 8px;
      padding: 0 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }

    .danger-button {
      background: #DC2626;
      color: #FFFFFF;
    }

    .ghost-button,
    .secondary-button {
      background: #F3F4F6;
      color: #374151;
    }

    .empty-state {
      padding: 0;
      color: #9CA3AF;
      text-align: center;
    }

    .empty-panel {
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .loading-line {
      height: 44px;
      border-radius: 10px;
    }

    .employee-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .employee-card {
      min-height: 184px;
      padding: 16px;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 1px rgba(15, 23, 42, 0.04);
    }

    .instant-grid {
      margin-top: 14px;
    }

    .card-top,
    .card-footer,
    .card-meta {
      display: flex;
      align-items: center;
    }

    .card-top,
    .card-footer {
      justify-content: space-between;
      gap: 12px;
    }

    .employee-card h2 {
      margin-top: 14px;
      color: #111827;
      font-size: 15px;
      font-weight: 600;
    }

    .employee-card p {
      margin-top: 4px;
      color: #9CA3AF;
      font-size: 12px;
    }

    .card-meta {
      gap: 8px;
      margin-top: 16px;
      color: #6B7280;
      font-size: 12px;
    }

    .card-meta span + span::before {
      margin-right: 8px;
      color: #D1D5DB;
      content: '•';
    }

    .card-footer {
      margin-top: 18px;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 80;
      display: grid;
      place-items: center;
      padding: 18px;
      background: rgba(15, 23, 42, 0.38);
    }

    .modal-card {
      width: min(100%, 520px);
      overflow: hidden;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    }

    .modal-card header,
    .modal-card footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .modal-card header {
      padding: 16px 18px;
      border-bottom: 1px solid #E5E7EB;
    }

    .modal-card header h2 {
      margin: 0;
      color: #111827;
      font-size: 16px;
      font-weight: 600;
    }

    .modal-card header button {
      border: 0;
      background: transparent;
      color: #9CA3AF;
      font-size: 22px;
      cursor: pointer;
    }

    .modal-card form {
      display: grid;
      gap: 12px;
      padding: 18px;
    }

    .modal-card label {
      display: grid;
      gap: 6px;
    }

    .modal-card label span {
      color: #6B7280;
      font-size: 12px;
      font-weight: 600;
    }

    .modal-card footer {
      justify-content: flex-end;
      padding-top: 6px;
    }

    .primary-button,
    .secondary-button {
      min-width: 96px;
      padding: 0 14px;
    }

    .primary-button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    @media (max-width: 980px) {
      .filter-bar {
        flex-wrap: wrap;
      }

      .employee-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .employees-page {
        padding: 16px;
      }

      .page-header {
        align-items: stretch;
        flex-direction: column;
      }

      .search-field,
      select,
      .view-toggle {
        width: 100%;
      }

      .employee-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class EmployeesComponent implements OnInit {
  employees: EmployeeListItem[] = [];
  filteredEmployees: EmployeeListItem[] = [];
  departments: any[] = [];
  searchQuery = '';
  selectedRole = '';
  selectedDepartment = '';
  viewMode: ViewMode = 'table';
  isLoading = true;
  showCreateModal = false;
  showEditModal = false;
  selectedEmployee: EmployeeListItem | null = null;
  confirmDeactivateId: string | null = null;
  successMessage = '';
  errorMessage = '';
  currentUserRole = '';

  createForm: FormGroup;
  editForm: FormGroup;

  constructor(
    private employeeService: EmployeeService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router,
  ) {
    this.createForm = this.fb.group({
      full_name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      role: ['employee', Validators.required],
      department_id: [''],
      phone: [''],
    });

    this.editForm = this.fb.group({
      full_name: ['', Validators.required],
      role: ['', Validators.required],
      department_id: [''],
      phone: [''],
    });
  }

  get canManage(): boolean {
    return ['admin', 'hr'].includes(this.currentUserRole);
  }

  get hasActiveFilters(): boolean {
    return Boolean(this.searchQuery.trim() || this.selectedRole || this.selectedDepartment);
  }

  get animatedEmployees(): EmployeeListItem[] {
    return this.filteredEmployees.slice(0, 10);
  }

  get instantEmployees(): EmployeeListItem[] {
    return this.filteredEmployees.slice(10);
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      if (user) {
        this.currentUserRole = user.role;
      }
    });

    this.employeeService.getDepartments().subscribe((departments) => {
      this.departments = departments;
    });

    this.loadEmployees();
  }

  loadEmployees(): void {
    this.isLoading = true;
    this.employeeService.getAll().subscribe({
      next: (data) => {
        this.employees = data;
        this.applyFilters();
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load employees';
        this.isLoading = false;
      },
    });
  }

  applyFilters(): void {
    const query = this.searchQuery.trim().toLowerCase();
    this.filteredEmployees = this.employees.filter((employee) => {
      const matchesSearch = !query ||
        employee.full_name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query) ||
        (employee.employee_id || '').toLowerCase().includes(query);

      const matchesRole = !this.selectedRole || employee.role === this.selectedRole;
      const matchesDepartment = !this.selectedDepartment ||
        employee.department_id === this.selectedDepartment ||
        employee.department_name === this.selectedDepartment;

      return matchesSearch && matchesRole && matchesDepartment;
    });
  }

  clearFilters(): void {
    this.searchQuery = '';
    this.selectedRole = '';
    this.selectedDepartment = '';
    this.applyFilters();
  }

  openCreateModal(): void {
    this.createForm.reset({ role: 'employee', department_id: '', phone: '' });
    this.showCreateModal = true;
  }

  openEditModal(employee: EmployeeListItem): void {
    this.selectedEmployee = employee;
    this.editForm.patchValue({
      full_name: employee.full_name,
      role: employee.role,
      department_id: employee.department_id || '',
      phone: employee.phone || '',
    });
    this.showEditModal = true;
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.selectedEmployee = null;
  }

  onCreateSubmit(): void {
    if (!this.createForm.valid) {
      return;
    }

    this.isLoading = true;
    this.employeeService.create(this.createForm.value).subscribe({
      next: () => {
        this.successMessage = 'Employee created successfully';
        this.closeModals();
        this.loadEmployees();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to create employee';
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      },
    });
  }

  onEditSubmit(): void {
    if (!this.editForm.valid || !this.selectedEmployee) {
      return;
    }

    this.isLoading = true;
    this.employeeService.update(this.selectedEmployee.id, this.editForm.value).subscribe({
      next: () => {
        this.successMessage = 'Employee updated successfully';
        this.closeModals();
        this.loadEmployees();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to update employee';
        this.isLoading = false;
        setTimeout(() => this.errorMessage = '', 3000);
      },
    });
  }

  get pendingDeactivateName(): string {
    if (!this.confirmDeactivateId) return '';
    return this.employees.find((e) => e.id === this.confirmDeactivateId)?.full_name || '';
  }

  onDeactivateConfirm(): void {
    if (!this.confirmDeactivateId) return;
    this.onDeactivate(this.confirmDeactivateId);
  }

  onDeactivate(id: string): void {
    this.employeeService.deactivate(id).subscribe({
      next: () => {
        this.successMessage = 'Employee deactivated successfully';
        this.confirmDeactivateId = null;
        this.loadEmployees();
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (error) => {
        this.errorMessage = error.error?.message || 'Failed to deactivate employee';
        this.confirmDeactivateId = null;
        setTimeout(() => this.errorMessage = '', 3000);
      },
    });
  }

  getInitials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase();
  }

  goToProfile(employeeId: string): void {
    this.router.navigate(['/employees', employeeId]);
  }

  avatarSrc(url: string | undefined): string {
    return resolveAvatarUrl(url);
  }

  getRoleBadgeClass(role: string): string {
    const key = role || 'employee';
    return `badge role-${key}`;
  }

  getStatusBadgeClass(isActive: boolean): string {
    return `badge ${isActive ? 'status-active' : 'status-inactive'}`;
  }
}
