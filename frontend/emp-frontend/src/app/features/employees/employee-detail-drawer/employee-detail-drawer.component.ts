import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Overlay, OverlayRef } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { Subscription } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { resolveAvatarUrl } from '../../../core/utils/avatar.util';

type AttendanceDay = {
  label?: string;
  day?: string;
  status?: string;
  hours?: number;
  value?: number;
};

type LeaveBalance = {
  type?: string;
  name?: string;
  used?: number;
  remaining?: number;
  total?: number;
  balance?: number;
};

type EmployeeDetail = {
  id: string;
  full_name?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  department_name?: string;
  department?: string;
  avatar_url?: string;
  attendance_last_7_days?: AttendanceDay[];
  weekly_attendance?: AttendanceDay[];
  leave_balances?: LeaveBalance[];
  leave_balance?: LeaveBalance[];
};

@Component({
  selector: 'app-employee-detail-drawer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <ng-template #drawerTemplate>
      <aside class="drawer" role="dialog" aria-modal="true" aria-label="Employee details" tabindex="-1">
        <header class="drawer-header">
          <button type="button" class="close-button" aria-label="Close employee details" (click)="close()">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>

        <section *ngIf="isLoading" class="loading-state">
          <div class="skeleton avatar-skeleton"></div>
          <div class="skeleton line wide"></div>
          <div class="skeleton line"></div>
          <div class="skeleton block"></div>
        </section>

        <section *ngIf="!isLoading && errorMessage" class="error-state">
          {{ errorMessage }}
        </section>

        <ng-container *ngIf="!isLoading && !errorMessage && employee">
          <section class="profile-head">
            <img *ngIf="employee.avatar_url" [src]="avatarSrc(employee.avatar_url)" [alt]="displayName" />
            <span *ngIf="!employee.avatar_url" class="avatar">{{ initials }}</span>
            <div>
              <h2>{{ displayName }}</h2>
              <div class="profile-meta">
                <span class="role-badge">{{ employee.role || 'Employee' }}</span>
                <span>{{ departmentName }}</span>
              </div>
            </div>
          </section>

          <section class="detail-section">
            <h3>Contact</h3>
            <dl class="contact-list">
              <div>
                <dt>Email</dt>
                <dd>{{ employee.email || '-' }}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{{ employee.phone || '-' }}</dd>
              </div>
            </dl>
          </section>

          <section class="detail-section">
            <div class="section-title-row">
              <h3>Attendance</h3>
              <span>Last 7 days</span>
            </div>

            <svg class="mini-chart" viewBox="0 0 252 96" role="img" aria-label="Last 7 days attendance bar chart">
              <line x1="0" y1="84" x2="252" y2="84" />
              <g *ngFor="let day of attendanceBars; let i = index">
                <rect
                  [attr.x]="i * 36 + 8"
                  [attr.y]="84 - day.height"
                  width="18"
                  [attr.height]="day.height"
                  rx="5"
                />
                <text [attr.x]="i * 36 + 17" y="94">{{ day.label }}</text>
              </g>
            </svg>
          </section>

          <section class="detail-section">
            <h3>Leave Balance</h3>
            <div class="leave-grid">
              <article *ngFor="let leave of leaveBalances">
                <strong>{{ leave.remaining }}</strong>
                <span>{{ leave.label }}</span>
              </article>
            </div>
          </section>

          <a class="profile-link" [href]="profileHref">
            View full profile
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
          </a>
        </ng-container>
      </aside>
    </ng-template>
  `,
  styles: [`
    :host {
      display: none;
    }

    .drawer {
      width: min(420px, 100vw);
      height: 100vh;
      overflow-y: auto;
      border-left: 1px solid #E5E7EB;
      background: #FFFFFF;
      box-shadow: -18px 0 48px rgba(15, 23, 42, 0.14);
      animation: drawerIn 300ms cubic-bezier(0.4, 0, 0.2, 1) both;
    }

    .drawer-header {
      display: flex;
      justify-content: flex-end;
      padding: 14px 16px 0;
    }

    .close-button {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #FFFFFF;
      color: #9CA3AF;
      cursor: pointer;
    }

    .close-button:hover {
      background: #F9FAFB;
      color: #374151;
    }

    .close-button svg,
    .profile-link svg {
      width: 17px;
      height: 17px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.9;
    }

    .profile-head,
    .detail-section,
    .loading-state,
    .error-state {
      margin: 18px;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
    }

    .profile-head {
      display: flex;
      gap: 14px;
      align-items: center;
      padding: 18px;
    }

    .profile-head img,
    .avatar,
    .avatar-skeleton {
      width: 58px;
      height: 58px;
      border-radius: 999px;
    }

    .profile-head img {
      object-fit: cover;
    }

    .avatar {
      display: grid;
      flex: 0 0 58px;
      place-items: center;
      background: #DBEAFE;
      color: #2563EB;
      font-size: 18px;
      font-weight: 700;
    }

    h2,
    h3,
    p,
    dl,
    dd {
      margin: 0;
    }

    h2 {
      color: #111827;
      font-size: 20px;
      font-weight: 600;
      line-height: 1.2;
    }

    h3 {
      color: #111827;
      font-size: 13px;
      font-weight: 700;
    }

    .profile-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      align-items: center;
      margin-top: 8px;
      color: #9CA3AF;
      font-size: 12px;
    }

    .role-badge {
      min-height: 23px;
      padding: 5px 9px;
      border-radius: 999px;
      background: #EFF6FF;
      color: #2563EB;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      text-transform: capitalize;
    }

    .detail-section,
    .loading-state,
    .error-state {
      padding: 16px;
    }

    .contact-list {
      display: grid;
      gap: 12px;
      margin-top: 14px;
    }

    .contact-list div {
      display: grid;
      gap: 4px;
    }

    dt {
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    dd {
      color: #374151;
      font-size: 13px;
      word-break: break-word;
    }

    .section-title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .section-title-row span {
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 600;
    }

    .mini-chart {
      display: block;
      width: 100%;
      margin-top: 16px;
    }

    .mini-chart line {
      stroke: #E5E7EB;
      stroke-width: 1;
    }

    .mini-chart rect {
      fill: #2563EB;
    }

    .mini-chart text {
      fill: #9CA3AF;
      font-size: 9px;
      text-anchor: middle;
    }

    .leave-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }

    .leave-grid article {
      min-width: 0;
      padding: 12px;
      border: 1px solid #F1F5F9;
      border-radius: 12px;
      background: #F8FAFC;
    }

    .leave-grid strong {
      display: block;
      color: #111827;
      font-size: 20px;
      font-weight: 700;
    }

    .leave-grid span {
      display: block;
      margin-top: 4px;
      overflow: hidden;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .profile-link {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      margin: 0 18px 22px;
      color: #2563EB;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }

    .loading-state {
      display: grid;
      gap: 12px;
    }

    .line {
      height: 12px;
      border-radius: 999px;
    }

    .line.wide {
      width: 70%;
    }

    .line:not(.wide) {
      width: 48%;
    }

    .block {
      height: 120px;
      border-radius: 12px;
    }

    .error-state {
      color: #991B1B;
      background: #FEF2F2;
      font-size: 13px;
    }

    @keyframes drawerIn {
      from {
        transform: translateX(100%);
      }

      to {
        transform: translateX(0);
      }
    }
  `],
})
export class EmployeeDetailDrawerComponent implements OnChanges, OnDestroy {
  @Input() employeeId = '';
  @Output() closed = new EventEmitter<void>();
  @ViewChild('drawerTemplate') private drawerTemplate?: TemplateRef<unknown>;

  employee: EmployeeDetail | null = null;
  isLoading = false;
  errorMessage = '';

  private overlayRef?: OverlayRef;
  private portal?: TemplatePortal;
  private subscriptions = new Subscription();

  constructor(
    private readonly http: HttpClient,
    private readonly overlay: Overlay,
    private readonly viewContainerRef: ViewContainerRef,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employeeId'] && this.employeeId) {
      queueMicrotask(() => this.open());
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.disposeOverlay();
  }

  get displayName(): string {
    return this.employee?.full_name || this.employee?.name || 'Employee';
  }

  avatarSrc(url: string | undefined | null): string {
    return resolveAvatarUrl(url);
  }

  get initials(): string {
    return this.displayName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'E';
  }

  get departmentName(): string {
    return this.employee?.department_name || this.employee?.department || 'Unassigned';
  }

  get profileHref(): string {
    return `/profile/${this.employeeId}`;
  }

  get attendanceBars(): Array<{ label: string; height: number }> {
    const records = this.employee?.attendance_last_7_days || this.employee?.weekly_attendance || [];
    const fallbackLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const normalized: AttendanceDay[] = records.length
      ? records.slice(-7)
      : fallbackLabels.map((label) => ({ label, value: 0 }));

    return normalized.map((record, index) => {
      const value = Number(record.hours ?? record.value ?? (record.status === 'present' ? 8 : 0));
      return {
        label: record.label || record.day || fallbackLabels[index] || '',
        height: Math.max(8, Math.min(72, (value / 8) * 72)),
      };
    });
  }

  get leaveBalances(): Array<{ label: string; remaining: number }> {
    const balances = this.employee?.leave_balances || this.employee?.leave_balance || [];
    const normalized = balances.map((balance) => ({
      label: balance.type || balance.name || 'Leave',
      remaining: Number(balance.remaining ?? balance.balance ?? balance.total ?? 0),
    }));

    return normalized.length ? normalized.slice(0, 3) : [
      { label: 'Annual', remaining: 0 },
      { label: 'Sick', remaining: 0 },
      { label: 'Casual', remaining: 0 },
    ];
  }

  close(): void {
    this.disposeOverlay();
    this.closed.emit();
  }

  private open(): void {
    if (!this.drawerTemplate) {
      return;
    }

    if (!this.overlayRef) {
      this.overlayRef = this.overlay.create({
        hasBackdrop: true,
        backdropClass: 'employee-detail-backdrop',
        panelClass: 'employee-detail-overlay-panel',
        scrollStrategy: this.overlay.scrollStrategies.block(),
        positionStrategy: this.overlay
          .position()
          .global()
          .top('0')
          .right('0'),
      });

      this.subscriptions.add(this.overlayRef.backdropClick().subscribe(() => this.close()));
      this.subscriptions.add(this.overlayRef.keydownEvents().subscribe((event) => {
        if (event.key === 'Escape') {
          this.close();
        }
      }));
    }

    if (!this.portal) {
      this.portal = new TemplatePortal(this.drawerTemplate, this.viewContainerRef);
    }

    if (!this.overlayRef.hasAttached()) {
      this.overlayRef.attach(this.portal);
    }

    this.loadEmployee();
    this.elementRef.nativeElement.ownerDocument.defaultView?.setTimeout(() => {
      const panel = this.overlayRef?.overlayElement.querySelector<HTMLElement>('.drawer');
      panel?.focus();
    });
  }

  private loadEmployee(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.employee = null;

    const request = this.http.get<EmployeeDetail>(`${environment.apiUrl}/employees/${this.employeeId}`).subscribe({
      next: (employee) => {
        this.employee = employee;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'Unable to load employee details.';
        this.isLoading = false;
      },
    });

    this.subscriptions.add(request);
  }

  private disposeOverlay(): void {
    this.overlayRef?.detach();
  }
}
