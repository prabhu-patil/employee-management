import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { LeaveRequestItem, LeaveService, LeaveStatus, LeaveType } from '../../core/services/leave.service';
import { ToastService } from '../../core/services/toast.service';

type LeaveTab = 'mine' | 'team';

@Component({
  selector: 'app-leave',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <main class="leave-page">
      <section class="page-header">
        <div>
          <p class="eyebrow">Employee self service</p>
          <h1>Leave Management</h1>
          <p class="subcopy">Apply for time off and track every request from submission to approval.</p>
        </div>
        <button type="button" class="primary-action" (click)="focusLeaveForm()">
          <span aria-hidden="true">+</span>
          Apply Leave
        </button>
      </section>

      <section class="metrics-grid" aria-label="Leave metrics">
        <article class="metric-card">
          <span class="metric-label">Total Requests</span>
          <strong>{{ myLeaves.length }}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-label">Pending</span>
          <strong>{{ countByStatus(myLeaves, 'pending') }}</strong>
        </article>
        <article class="metric-card">
          <span class="metric-label">Approved</span>
          <strong>{{ countByStatus(myLeaves, 'approved') }}</strong>
        </article>
        <article class="metric-card" *ngIf="canReview">
          <span class="metric-label">Team Pending</span>
          <strong>{{ countByStatus(teamLeaves, 'pending') }}</strong>
        </article>
      </section>

      <section class="leave-workspace">
        <article class="form-panel" id="leaveFormPanel">
          <div class="panel-heading">
            <div>
              <h2>Request Leave</h2>
              <p>Submit leave with the same employee flow used in the tutorial.</p>
            </div>
          </div>

          <form [formGroup]="leaveForm" (ngSubmit)="submitLeave()" class="leave-form">
            <label>
              Leave Type
              <select formControlName="leave_type">
                <option *ngFor="let type of leaveTypes" [value]="type.value">{{ type.label }}</option>
              </select>
            </label>

            <div class="date-grid">
              <label>
                From Date
                <input type="date" formControlName="start_date">
              </label>
              <label>
                To Date
                <input type="date" formControlName="end_date">
              </label>
            </div>

            <label>
              Reason
              <textarea rows="4" formControlName="reason" placeholder="Add a short reason for this leave request"></textarea>
            </label>

            <p class="form-error" *ngIf="dateRangeInvalid">End date cannot be before start date.</p>

            <button type="submit" class="submit-button" [disabled]="leaveForm.invalid || dateRangeInvalid || submitting">
              {{ submitting ? 'Submitting...' : 'Submit Request' }}
            </button>
          </form>
        </article>

        <article class="list-panel">
          <div class="panel-heading">
            <div>
              <h2>Leave Records</h2>
              <p>{{ activeTab === 'mine' ? 'Your request history' : 'Requests awaiting HR action' }}</p>
            </div>
            <div class="tabs" *ngIf="canReview">
              <button type="button" [class.active]="activeTab === 'mine'" (click)="activeTab = 'mine'">Mine</button>
              <button type="button" [class.active]="activeTab === 'team'" (click)="activeTab = 'team'">Team</button>
            </div>
          </div>

          <div class="table-shell">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th *ngIf="activeTab === 'team'">Employee</th>
                  <th>Type</th>
                  <th>Duration</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th *ngIf="activeTab === 'team' && canReview">Action</th>
                </tr>
              </thead>
              <tbody *ngIf="loading">
                <tr>
                  <td [attr.colspan]="activeTab === 'team' ? 7 : 5" class="empty-cell">Loading leave records...</td>
                </tr>
              </tbody>
              <tbody *ngIf="!loading && displayedLeaves.length === 0">
                <tr>
                  <td [attr.colspan]="activeTab === 'team' ? 7 : 5" class="empty-cell">
                    {{ activeTab === 'mine' ? 'No leave requests submitted yet.' : 'No team leave requests found.' }}
                  </td>
                </tr>
              </tbody>
              <tbody *ngIf="!loading && displayedLeaves.length">
                <tr *ngFor="let leave of displayedLeaves; let index = index; trackBy: trackByLeave">
                  <td>{{ index + 1 }}</td>
                  <td *ngIf="activeTab === 'team'">
                    <div class="employee-cell">
                      <span>{{ initials(leave.employee_name) }}</span>
                      <div>
                        <strong>{{ leave.employee_name }}</strong>
                        <small>{{ leave.employee_id || leave.employee_email }}</small>
                      </div>
                    </div>
                  </td>
                  <td>{{ formatType(leave.leave_type) }}</td>
                  <td>
                    <strong>{{ leave.start_date | date:'mediumDate' }}</strong>
                    <small>{{ leave.end_date | date:'mediumDate' }} · {{ durationDays(leave) }} day{{ durationDays(leave) === 1 ? '' : 's' }}</small>
                  </td>
                  <td class="reason-cell">{{ leave.reason || 'No reason added' }}</td>
                  <td><span class="status-pill" [class]="leave.status">{{ leave.status }}</span></td>
                  <td *ngIf="activeTab === 'team' && canReview">
                    <div class="row-actions" *ngIf="leave.status === 'pending'; else lockedStatus">
                      <button type="button" class="approve" (click)="reviewLeave(leave, 'approved')" [disabled]="reviewingId === leave.id">Approve</button>
                      <button type="button" class="reject" (click)="reviewLeave(leave, 'rejected')" [disabled]="reviewingId === leave.id">Reject</button>
                    </div>
                    <ng-template #lockedStatus>
                      <span class="reviewed">Reviewed</span>
                    </ng-template>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #F7F9FC;
      color: #111827;
    }

    .leave-page {
      min-height: 100vh;
      padding: 24px;
    }

    .page-header,
    .panel-heading,
    .employee-cell,
    .row-actions,
    .tabs {
      display: flex;
      align-items: center;
    }

    .page-header {
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .eyebrow {
      margin: 0 0 6px;
      color: #2563EB;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    h1,
    h2,
    p {
      margin: 0;
    }

    h1 {
      font-size: 28px;
      line-height: 1.1;
    }

    h2 {
      font-size: 17px;
      line-height: 1.2;
    }

    .subcopy,
    .panel-heading p {
      margin-top: 6px;
      color: #6B7280;
      font-size: 14px;
    }

    .primary-action,
    .submit-button,
    .tabs button,
    .row-actions button {
      border: 0;
      border-radius: 8px;
      font-weight: 700;
      cursor: pointer;
    }

    .primary-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      padding: 0 16px;
      background: #2563EB;
      color: #FFFFFF;
      box-shadow: 0 8px 18px rgba(37, 99, 235, 0.18);
    }

    .primary-action span {
      font-size: 18px;
      line-height: 1;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 18px;
    }

    .metric-card,
    .form-panel,
    .list-panel {
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
    }

    .metric-card {
      padding: 16px;
    }

    .metric-label {
      display: block;
      margin-bottom: 8px;
      color: #6B7280;
      font-size: 12px;
      font-weight: 700;
    }

    .metric-card strong {
      font-size: 26px;
      line-height: 1;
    }

    .leave-workspace {
      display: grid;
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      gap: 18px;
      align-items: start;
    }

    .form-panel,
    .list-panel {
      padding: 18px;
    }

    .panel-heading {
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 16px;
    }

    .leave-form {
      display: grid;
      gap: 14px;
    }

    label {
      display: grid;
      gap: 7px;
      color: #374151;
      font-size: 13px;
      font-weight: 700;
    }

    input,
    select,
    textarea {
      width: 100%;
      border: 1px solid #D1D5DB;
      border-radius: 8px;
      background: #FFFFFF;
      color: #111827;
      font: inherit;
      font-weight: 500;
      outline: none;
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    input,
    select {
      height: 42px;
      padding: 0 12px;
    }

    textarea {
      min-height: 96px;
      resize: vertical;
      padding: 12px;
    }

    input:focus,
    select:focus,
    textarea:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
    }

    .date-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .form-error {
      color: #DC2626;
      font-size: 12px;
      font-weight: 700;
    }

    .submit-button {
      height: 42px;
      background: #111827;
      color: #FFFFFF;
    }

    button:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .tabs {
      gap: 4px;
      padding: 4px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background: #F9FAFB;
    }

    .tabs button {
      min-height: 30px;
      padding: 0 12px;
      background: transparent;
      color: #6B7280;
      font-size: 12px;
    }

    .tabs button.active {
      background: #FFFFFF;
      color: #2563EB;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
    }

    .table-shell {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 720px;
    }

    th,
    td {
      padding: 13px 12px;
      border-bottom: 1px solid #EEF2F7;
      text-align: left;
      vertical-align: middle;
      font-size: 13px;
    }

    th {
      color: #6B7280;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    td small {
      display: block;
      margin-top: 4px;
      color: #6B7280;
      font-size: 12px;
    }

    .employee-cell {
      gap: 10px;
    }

    .employee-cell span {
      display: grid;
      flex: 0 0 34px;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #DBEAFE;
      color: #2563EB;
      font-size: 12px;
      font-weight: 800;
    }

    .employee-cell strong {
      display: block;
      line-height: 1.2;
    }

    .reason-cell {
      max-width: 260px;
      color: #4B5563;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 76px;
      height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 800;
      text-transform: capitalize;
    }

    .status-pill.pending {
      background: #FEF3C7;
      color: #92400E;
    }

    .status-pill.approved {
      background: #DCFCE7;
      color: #166534;
    }

    .status-pill.rejected {
      background: #FEE2E2;
      color: #991B1B;
    }

    .status-pill.cancelled {
      background: #E5E7EB;
      color: #374151;
    }

    .row-actions {
      gap: 8px;
    }

    .row-actions button {
      min-height: 30px;
      padding: 0 10px;
      font-size: 12px;
    }

    .approve {
      background: #DCFCE7;
      color: #166534;
    }

    .reject {
      background: #FEE2E2;
      color: #991B1B;
    }

    .reviewed {
      color: #6B7280;
      font-size: 12px;
      font-weight: 700;
    }

    .empty-cell {
      height: 120px;
      color: #6B7280;
      text-align: center;
    }

    @media (max-width: 1180px) {
      .metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .leave-workspace {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 640px) {
      .leave-page {
        padding: 16px;
      }

      .page-header,
      .panel-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .primary-action {
        width: 100%;
        justify-content: center;
      }

      .metrics-grid,
      .date-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class LeaveComponent implements OnInit {
  private fb = inject(FormBuilder);

  leaveTypes: { value: LeaveType; label: string }[] = [
    { value: 'annual', label: 'Annual Leave' },
    { value: 'sick', label: 'Sick Leave' },
    { value: 'casual', label: 'Casual Leave' },
    { value: 'unpaid', label: 'Unpaid Leave' },
  ];

  leaveForm = this.fb.nonNullable.group({
    leave_type: ['casual' as LeaveType, Validators.required],
    start_date: ['', Validators.required],
    end_date: ['', Validators.required],
    reason: ['', [Validators.maxLength(500)]],
  });

  myLeaves: LeaveRequestItem[] = [];
  teamLeaves: LeaveRequestItem[] = [];
  activeTab: LeaveTab = 'mine';
  loading = false;
  submitting = false;
  reviewingId: string | null = null;
  currentRole = 'employee';

  constructor(
    private leaveService: LeaveService,
    private authService: AuthService,
    private toastService: ToastService,
  ) {}

  ngOnInit(): void {
    const user = this.authService.getCurrentUser();
    this.currentRole = user?.role || this.authService.getUserRole() || 'employee';
    this.loadLeaves();
  }

  get canReview(): boolean {
    return ['admin', 'hr', 'manager'].includes(this.currentRole);
  }

  get displayedLeaves(): LeaveRequestItem[] {
    return this.activeTab === 'team' ? this.teamLeaves : this.myLeaves;
  }

  get dateRangeInvalid(): boolean {
    const startDate = this.leaveForm.controls.start_date.value;
    const endDate = this.leaveForm.controls.end_date.value;
    return Boolean(startDate && endDate && endDate < startDate);
  }

  loadLeaves(): void {
    this.loading = true;
    this.leaveService.getMyLeaves()
      .pipe(finalize(() => {
        if (!this.canReview) {
          this.loading = false;
        }
      }))
      .subscribe({
        next: (leaves) => {
          this.myLeaves = leaves;
        },
        error: () => {
          this.toastService.error('Leave records unavailable', 'Could not load your leave history.');
        },
      });

    if (this.canReview) {
      this.leaveService.getTeamLeaves()
        .pipe(finalize(() => {
          this.loading = false;
        }))
        .subscribe({
          next: (leaves) => {
            this.teamLeaves = leaves;
          },
          error: () => {
            this.toastService.error('Team records unavailable', 'Could not load team leave requests.');
          },
        });
    }
  }

  submitLeave(): void {
    if (this.leaveForm.invalid || this.dateRangeInvalid || this.submitting) {
      this.leaveForm.markAllAsTouched();
      return;
    }

    const value = this.leaveForm.getRawValue();
    this.submitting = true;

    this.leaveService.apply({
      leave_type: value.leave_type,
      start_date: value.start_date,
      end_date: value.end_date,
      reason: value.reason?.trim() || null,
    })
      .pipe(finalize(() => {
        this.submitting = false;
      }))
      .subscribe({
        next: (leave) => {
          this.myLeaves = [leave, ...this.myLeaves];
          this.leaveForm.reset({
            leave_type: 'casual',
            start_date: '',
            end_date: '',
            reason: '',
          });
          this.toastService.success('Leave submitted', 'Your request is now pending review.');
        },
        error: (error) => {
          const message = error?.error?.detail || 'Please check the dates and try again.';
          this.toastService.error('Leave request failed', message);
        },
      });
  }

  reviewLeave(leave: LeaveRequestItem, nextStatus: Extract<LeaveStatus, 'approved' | 'rejected'>): void {
    if (this.reviewingId) {
      return;
    }

    this.reviewingId = leave.id;
    const request = nextStatus === 'approved'
      ? this.leaveService.approve(leave.id)
      : this.leaveService.reject(leave.id);

    request.pipe(finalize(() => {
      this.reviewingId = null;
    })).subscribe({
      next: (updatedLeave) => {
        this.teamLeaves = this.teamLeaves.map((item) => item.id === updatedLeave.id ? updatedLeave : item);
        this.toastService.success('Leave updated', `${updatedLeave.employee_name}'s request was ${nextStatus}.`);
      },
      error: () => {
        this.toastService.error('Review failed', 'Could not update this leave request.');
      },
    });
  }

  focusLeaveForm(): void {
    document.getElementById('leaveFormPanel')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  countByStatus(leaves: LeaveRequestItem[], status: LeaveStatus): number {
    return leaves.filter((leave) => leave.status === status).length;
  }

  formatType(type: LeaveType): string {
    return this.leaveTypes.find((item) => item.value === type)?.label || type;
  }

  durationDays(leave: LeaveRequestItem): number {
    const start = new Date(`${leave.start_date}T00:00:00`);
    const end = new Date(`${leave.end_date}T00:00:00`);
    const diff = end.getTime() - start.getTime();
    return Math.max(1, Math.floor(diff / 86400000) + 1);
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('') || 'U';
  }

  trackByLeave(_: number, leave: LeaveRequestItem): string {
    return leave.id;
  }
}
