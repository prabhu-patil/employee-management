import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { Router } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { EmployeeListItem, EmployeeService } from '../../core/services/employee.service';
import { resolveAvatarUrl } from '../../core/utils/avatar.util';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

type AttendanceTab = 'today' | 'history' | 'summary' | 'admin';
type LocationStatus = 'getting' | 'ready' | 'failed';
type CellStatus = 'present' | 'half' | 'absent' | 'none';

type AdminRow = {
  userId: string;
  name: string;
  cells: CellStatus[];
};

type AdminLogRow = {
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  shift: string;
  status: 'Present' | 'Late' | 'Half Day' | 'Leave' | 'WFH' | 'Absent';
};

type AdminSubTab = 'today' | 'summary' | 'log' | 'analytics';

type AdminStatusRing = { label: string; value: number; color: string };

type AdminSummaryStats = {
  present: number;
  late: number;
  half: number;
  wfh: number;
  leave: number;
  absent: number;
  totalHours: string;
  avgHours: string;
};

type LocationData = {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  source?: 'gps' | 'ip';
};

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, EmptyStateComponent, NgxEchartsDirective],
  template: `
    <main class="attendance-page">
      <section class="attendance-shell">
        <header class="page-header">
          <div>
            <p>Attendance</p>
            <h1>{{ greeting }}</h1>
            <span>Track check-in, check-out, and monthly attendance.</span>
          </div>

        </header>

        <div *ngIf="successMessage" class="notice success">{{ successMessage }}</div>
        <div *ngIf="errorMessage" class="notice error">{{ errorMessage }}</div>

        <section *ngIf="activeTab === 'today'" class="today-grid">
          <article class="check-card clock-card">
            <header class="check-card-head">
              <span class="check-icon clock">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="9"/>
                  <path d="M12 7v5l3 2"/>
                </svg>
              </span>
              <span class="location-badge" [class.gps]="locationStatus === 'ready' && currentLocation?.source === 'gps'" [class.ip]="locationStatus === 'ready' && currentLocation?.source === 'ip'" [class.requesting]="locationStatus !== 'ready'">
                <span *ngIf="locationStatus === 'getting'" class="mini-spinner"></span>
                <span *ngIf="locationStatus !== 'getting'" class="location-dot"></span>
                {{ locationLabel }}
              </span>
            </header>

            <div class="clock-block">
              <p class="section-label">Current time</p>
              <div class="clock">{{ currentTime }}</div>
              <p class="date-label">{{ currentDateLabel }}</p>
            </div>

            <ul class="meta-list">
              <li>
                <em>Shift</em>
                <span>09:00 — 18:00</span>
              </li>
              <li>
                <em>Day</em>
                <span>{{ currentDateLabel.split(',')[0] }}</span>
              </li>
            </ul>
          </article>

          <article class="check-card status-card session-card">
            <header class="check-card-head">
              <span class="check-icon login">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                  <path d="M10 17l5-5-5-5"/>
                  <path d="M15 12H3"/>
                </svg>
              </span>
              <span class="active-pill">
                <span class="active-dot"></span>
                Active session
              </span>
            </header>

            <div class="login-block">
              <p class="section-label">Logged in at</p>
              <div class="check-in-time">{{ sessionStartLabel }}</div>
            </div>

            <div class="elapsed-panel">
              <div class="elapsed-head">
                <p>Session time</p>
                <span class="elapsed-icon">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="9"/>
                    <path d="M12 7v5l3 2"/>
                  </svg>
                </span>
              </div>
              <strong>{{ sessionElapsed }}</strong>
            </div>

            <p class="session-hint">Session started when you signed in. Sign out to end your day.</p>
          </article>

          <article *ngIf="false" class="check-card status-card">
            <div *ngIf="!todayRecord" class="empty-state">
              <app-empty-state
                icon="calendar"
                title="No attendance data"
                description="Sign in starts your session.">
              </app-empty-state>
            </div>

            <div *ngIf="todayRecord && !canCheckOut" class="complete-state">
              <p class="section-label">Today's total</p>
              <strong>{{ formatDuration(todayRecord.total_hours) }}</strong>
              <h2>Attendance completed</h2>
              <p>You have completed your attendance for today.</p>
            </div>
          </article>
        </section>

        <section *ngIf="activeTab === 'history'" class="surface-card history-card">
          <div class="card-heading">
            <div>
              <h2>Monthly History</h2>
              <p>Review daily attendance records.</p>
            </div>
            <div class="month-controls">
              <select [(ngModel)]="selectedMonth" (ngModelChange)="loadMonthlyData(selectedYear, selectedMonth)">
                <option *ngFor="let month of months" [ngValue]="month.value">{{ month.label }}</option>
              </select>
              <select [(ngModel)]="selectedYear" (ngModelChange)="loadMonthlyData(selectedYear, selectedMonth)">
                <option *ngFor="let year of years" [ngValue]="year">{{ year }}</option>
              </select>
            </div>
          </div>

          <div *ngIf="monthlyRecords.length > 0" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Check-In</th>
                  <th>Check-Out</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let record of monthlyRecords; let i = index" [style.animation-delay.ms]="i * 35">
                  <td>{{ formatDate(record.date) }}</td>
                  <td>{{ getDayName(record.date) }}</td>
                  <td>{{ formatTime(record.check_in) }}</td>
                  <td>{{ formatTime(record.check_out) }}</td>
                  <td>{{ record.total_hours ?? '-' }}</td>
                  <td><span [class]="getStatusClass(record.status)">{{ record.status || 'not marked' }}</span></td>
                  <td><span class="mode-pill" [attr.data-mode]="record.work_mode || 'office'">{{ formatMode(record.work_mode) }}</span></td>
                  <td>
                    <span class="loc-text" *ngIf="record.city || record.country">{{ formatLocation(record) }}</span>
                    <span class="loc-text muted" *ngIf="!record.city && !record.country">{{ record.location_verified ? 'Verified' : '—' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div *ngIf="monthlyRecords.length === 0" class="empty-state table-empty">
            <app-empty-state
              icon="calendar"
              title="No attendance data"
              description="There is no attendance data for this month."
              actionLabel="Refresh"
              (actionClick)="loadMonthlyData(selectedYear, selectedMonth)">
            </app-empty-state>
          </div>
        </section>

        <section *ngIf="activeTab === 'admin'" class="admin-section">
          <ng-container *ngIf="selectedAttendanceUser">
            <section class="admin-profile-card">
              <div class="profile-row">
                <div class="profile-avatar" [class.has-image]="!!selectedAttendanceUser.avatar_url">
                  <img *ngIf="selectedAttendanceUser.avatar_url" [src]="avatarSrc(selectedAttendanceUser.avatar_url)" [alt]="selectedAttendanceUser.full_name" />
                  <span *ngIf="!selectedAttendanceUser.avatar_url">{{ getNameInitials(selectedAttendanceUser.full_name).charAt(0) }}</span>
                </div>
                <div class="profile-info">
                  <strong>{{ selectedAttendanceUser.full_name }}</strong>
                  <span class="profile-title">{{ titleCaseRole(selectedAttendanceUser.role) }}</span>
                  <ul class="profile-meta">
                    <li><em>ID</em> {{ selectedAttendanceUser.employee_id || '—' }}</li>
                    <li><em>Dept.</em> {{ selectedAttendanceUser.department_name || 'Unassigned' }}</li>
                    <li><em>Joined</em> {{ joinedDateLabel }}</li>
                  </ul>
                </div>
              </div>

              <ul class="metric-tiles">
                <li class="metric-tile">
                  <div class="metric-text"><span>AVG WORKING HOURS</span><strong>{{ adminMetricTiles.avgHours }}</strong></div>
                  <span class="metric-dot" style="background:#EDE9FE"></span>
                </li>
                <li class="metric-tile">
                  <div class="metric-text"><span>SHIFT IN TIME</span><strong>{{ adminMetricTiles.shiftIn }}</strong></div>
                  <span class="metric-dot" style="background:#DCFCE7"></span>
                </li>
                <li class="metric-tile">
                  <div class="metric-text"><span>AVG OUT TIME</span><strong>{{ adminMetricTiles.avgOut }}</strong></div>
                  <span class="metric-dot" style="background:#FFEDD5"></span>
                </li>
                <li class="metric-tile">
                  <div class="metric-text"><span>AVG BREAK TIME</span><strong>{{ adminMetricTiles.avgBreak }}</strong></div>
                  <span class="metric-dot" style="background:#F3E8FF"></span>
                </li>
              </ul>
            </section>

            <div *ngIf="selectedUserLoading" class="grid-loading">Loading attendance…</div>

            <div *ngIf="!selectedUserLoading && adminLogRows.length > 0" class="admin-tabs-card">
              <div class="admin-subtabs">
                <button type="button" class="admin-subtab" [class.active]="adminSubTab === 'today'" (click)="setAdminSubTab('today')">
                  <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
                  <span>Today</span>
                </button>
                <button type="button" class="admin-subtab" [class.active]="adminSubTab === 'summary'" (click)="setAdminSubTab('summary')">
                  <svg viewBox="0 0 24 24"><path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/></svg>
                  <span>Summary</span>
                </button>
                <button type="button" class="admin-subtab" [class.active]="adminSubTab === 'log'" (click)="setAdminSubTab('log')">
                  <svg viewBox="0 0 24 24"><path d="M3 5h18v4H3zM3 11h18v4H3zM3 17h18v4H3z"/></svg>
                  <span>Attendance Log</span>
                </button>
                <button type="button" class="admin-subtab" [class.active]="adminSubTab === 'analytics'" (click)="setAdminSubTab('analytics')">
                  <svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/></svg>
                  <span>Analytics</span>
                </button>
              </div>

              <div *ngIf="adminSubTab === 'analytics'" class="admin-analytics-grid">
                <section class="admin-analytics-card">
                  <header class="admin-analytics-head"><h3>Attendance Distribution</h3></header>
                  <div class="admin-distribution-chart" echarts [options]="adminDistributionChart" [autoResize]="true"></div>
                </section>
                <section class="admin-analytics-card">
                  <header class="admin-analytics-head"><h3>Status Overview</h3></header>
                  <ul class="admin-ring-grid">
                    <li *ngFor="let ring of adminStatusRings" class="admin-ring-cell">
                      <div class="admin-ring-chart" echarts [options]="adminRingOption(ring.value, ring.color)" [autoResize]="true"></div>
                      <span class="admin-ring-label">{{ ring.label }}</span>
                    </li>
                  </ul>
                </section>
              </div>

              <div *ngIf="adminSubTab === 'today'" class="admin-today-panel">
                <ng-container *ngIf="adminTodayRow; else noAdminToday">
                  <div class="admin-today-grid">
                    <div class="admin-today-card"><span class="lbl">Date</span><strong>{{ adminTodayRow.date }}</strong></div>
                    <div class="admin-today-card"><span class="lbl">Check In</span><strong>{{ adminTodayRow.checkIn }}</strong></div>
                    <div class="admin-today-card"><span class="lbl">Check Out</span><strong>{{ adminTodayRow.checkOut }}</strong></div>
                    <div class="admin-today-card"><span class="lbl">Working Hours</span><strong>{{ adminTodayRow.workingHours }}</strong></div>
                    <div class="admin-today-card"><span class="lbl">Shift</span><strong>{{ adminTodayRow.shift }}</strong></div>
                    <div class="admin-today-card">
                      <span class="lbl">Status</span>
                      <span class="status-pill" [attr.data-status]="adminTodayRow.status">{{ adminTodayRow.status }}</span>
                    </div>
                  </div>
                </ng-container>
                <ng-template #noAdminToday>
                  <div class="admin-empty-today">No attendance record for today.</div>
                </ng-template>
              </div>

              <div *ngIf="adminSubTab === 'summary'" class="admin-summary-panel">
                <div class="admin-summary-tiles">
                  <article class="admin-summary-tile" data-tone="present"><span>Present</span><strong>{{ adminSummaryStats.present }}</strong></article>
                  <article class="admin-summary-tile" data-tone="late"><span>Late</span><strong>{{ adminSummaryStats.late }}</strong></article>
                  <article class="admin-summary-tile" data-tone="half"><span>Half Day</span><strong>{{ adminSummaryStats.half }}</strong></article>
                  <article class="admin-summary-tile" data-tone="wfh"><span>WFH</span><strong>{{ adminSummaryStats.wfh }}</strong></article>
                  <article class="admin-summary-tile" data-tone="leave"><span>On Leave</span><strong>{{ adminSummaryStats.leave }}</strong></article>
                  <article class="admin-summary-tile" data-tone="absent"><span>Absent</span><strong>{{ adminSummaryStats.absent }}</strong></article>
                  <article class="admin-summary-tile" data-tone="hours"><span>Total Hours</span><strong>{{ adminSummaryStats.totalHours }}</strong></article>
                  <article class="admin-summary-tile" data-tone="avg"><span>Avg / Day</span><strong>{{ adminSummaryStats.avgHours }}</strong></article>
                </div>
              </div>

              <div *ngIf="adminSubTab === 'log'" class="admin-log-inner">
                <header class="admin-log-header">
                  <h3>Attendance Log</h3>
                  <span *ngIf="adminLogUsingSample" class="sample-tag">Sample data</span>
                </header>
                <div class="dir-scroll">
                  <table class="admin-log-table">
                    <thead>
                      <tr>
                        <th>DATE</th>
                        <th>CHECK IN</th>
                        <th>CHECK OUT</th>
                        <th>WORKING HOURS</th>
                        <th>SHIFT</th>
                        <th>STATUS</th>
                        <th class="actions-col">ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let row of adminLogRows">
                        <td>{{ row.date }}</td>
                        <td>{{ row.checkIn }}</td>
                        <td>{{ row.checkOut }}</td>
                        <td>{{ row.workingHours }}</td>
                        <td>{{ row.shift }}</td>
                        <td><span class="status-pill" [attr.data-status]="row.status">{{ row.status }}</span></td>
                        <td class="actions-col">
                          <button type="button" class="row-delete" aria-label="Delete row" title="Delete">
                            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </ng-container>
        </section>

        <section *ngIf="activeTab === 'summary'" class="summary-grid">
          <div class="summary-metrics">
            <article *ngFor="let metric of summaryMetrics" class="summary-card" [attr.data-tone]="metric.tone">
              <header class="summary-head">
                <p>{{ metric.label }}</p>
                <span class="summary-icon" [innerHTML]="getSummaryIcon(metric.icon)"></span>
              </header>
              <strong>{{ metric.value }}</strong>
              <div class="summary-bar"><span [style.width.%]="metric.barPercent"></span></div>
              <p class="summary-hint">{{ metric.hint }}</p>
            </article>
          </div>

          <article class="surface-card percentage-card">
            <h2>Attendance Percentage</h2>
            <div class="progress-ring">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="52" stroke="#F1F5F9" stroke-width="12" fill="none"></circle>
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  stroke="#2563EB"
                  stroke-width="12"
                  fill="none"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="progressDasharray"
                  stroke-dashoffset="0"
                ></circle>
              </svg>
              <div>
                <strong>{{ monthlySummary?.attendance_percentage || 0 }}%</strong>
                <span>this month</span>
              </div>
            </div>
            <div class="wfh-card">
              <p>WFH days</p>
              <strong>{{ monthlySummary?.wfh_days || 0 }}</strong>
            </div>
          </article>
        </section>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      color: #111827;
    }

    .attendance-page {
      min-height: 100vh;
      padding: 24px;
      background: #F7F9FC;
    }

    .attendance-shell {
      max-width: 1180px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .page-header p,
    .page-header h1,
    .page-header span,
    .section-label,
    .date-label,
    .card-heading h2,
    .card-heading p,
    .summary-card p,
    .summary-card strong,
    .percentage-card h2 {
      margin: 0;
    }

    .page-header p {
      color: #2563EB;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .page-header h1 {
      margin-top: 5px;
      color: #111827;
      font-size: 24px;
      font-weight: 600;
      letter-spacing: 0;
    }

    .page-header span {
      display: block;
      margin-top: 4px;
      color: #9CA3AF;
      font-size: 13px;
    }

    .tab-list {
      display: flex;
      gap: 4px;
      padding: 4px;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .tab-list button {
      min-height: 34px;
      border: 0;
      border-radius: 9px;
      padding: 0 14px;
      background: transparent;
      color: #6B7280;
      font-size: 13px;
      font-weight: 600;
      text-transform: capitalize;
      cursor: pointer;
    }

    .tab-list button.active {
      background: #EFF6FF;
      color: #2563EB;
    }

    .notice {
      margin-bottom: 14px;
      padding: 11px 13px;
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

    .today-grid,
    .summary-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
      gap: 16px;
    }

    .check-card,
    .surface-card {
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .check-card {
      padding: 24px;
    }

    .check-card:not(.status-card),
    .clock-card {
      display: flex;
      flex-direction: column;
      gap: 22px;
      min-height: 318px;
    }

    .check-card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .check-icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 12px;
    }

    .check-icon.clock {
      background: linear-gradient(135deg, #DBEAFE, #BFDBFE);
      color: #1D4ED8;
    }

    .check-icon.login {
      background: linear-gradient(135deg, #DCFCE7, #BBF7D0);
      color: #15803D;
    }

    .check-icon svg {
      width: 22px;
      height: 22px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .clock-block,
    .login-block {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .meta-list {
      list-style: none;
      margin: 0;
      padding: 14px 0 0;
      border-top: 1px solid #F1F5F9;
      display: flex;
      gap: 28px;
    }

    .meta-list li {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-list li em {
      font-style: normal;
      font-weight: 600;
      font-size: 10px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #94A3B8;
    }

    .meta-list li span {
      font-size: 13px;
      font-weight: 600;
      color: #0F172A;
    }

    .active-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 999px;
      background: #DCFCE7;
      color: #15803D;
      font-size: 12px;
      font-weight: 600;
    }

    .active-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: #15803D;
      box-shadow: 0 0 0 3px rgb(34 197 94 / 0.18);
      animation: pulse 1.4s ease-in-out infinite;
    }

    .elapsed-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .elapsed-icon {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #FFFFFF;
      color: #64748B;
      border: 1px solid #E2E8F0;
    }

    .elapsed-icon svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .section-label {
      color: #6B7280;
      font-size: 12px;
      font-weight: 600;
    }

    .clock {
      margin-top: 8px;
      color: #111827;
      font-family: Inter, sans-serif;
      font-size: 32px;
      font-weight: 300;
      letter-spacing: -0.5px;
      line-height: 1;
    }

    .date-label {
      margin-top: 8px;
      color: #9CA3AF;
      font-size: 13px;
    }

    .location-badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 30px;
      border-radius: 999px;
      padding: 0 11px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .location-badge.gps {
      background: #DCFCE7;
      color: #166534;
    }

    .location-badge.ip {
      background: #FEF3C7;
      color: #92400E;
    }

    .location-badge.requesting {
      background: #F3F4F6;
      color: #6B7280;
    }

    .location-dot {
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

    .work-mode {
      margin-top: 30px;
    }

    .work-mode-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 9px;
      margin-top: 10px;
    }

    .work-mode-pill {
      display: grid;
      place-items: center;
      min-height: 40px;
      border: 1px solid #E5E7EB;
      border-radius: 999px;
      background: #F3F4F6;
      color: #6B7280;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    .work-mode-pill:hover:not(:disabled) {
      background: #E5E7EB;
    }

    .work-mode-pill.active {
      border-color: #BFDBFE;
      background: #EFF6FF;
      color: #2563EB;
    }

    .work-mode-pill:disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .primary-check-button,
    .checkout-button {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      width: 100%;
      min-height: 50px;
      overflow: hidden;
      border: 0;
      border-radius: 10px;
      padding: 14px;
      color: #FFFFFF;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
    }

    .primary-check-button {
      margin-top: 30px;
      background: #2563EB;
    }

    .checkout-button {
      margin-top: 20px;
      background: #DC2626;
      box-shadow: 0 12px 24px rgba(220, 38, 38, 0.2);
    }

    .primary-check-button:disabled,
    .checkout-button:disabled {
      cursor: not-allowed;
      opacity: 0.65;
    }

    .ripple-button:not(:disabled):active .ripple-ring {
      animation: attendanceRipple 520ms ease-out;
    }

    .ripple-ring {
      position: absolute;
      inset: 0;
      margin: auto;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      border: 1px solid rgba(255, 255, 255, 0.65);
      opacity: 0;
      pointer-events: none;
    }

    .button-spinner {
      width: 16px;
      height: 16px;
      color: #FFFFFF;
    }

    .status-card {
      min-height: 318px;
    }

    .session-card {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .session-card .check-in-time {
      color: #2563EB;
      font-size: 36px;
      font-weight: 700;
      line-height: 1;
    }

    .session-card .elapsed-panel {
      margin-top: 0;
    }

    .session-card .elapsed-panel strong {
      color: #111827;
      font-size: 32px;
    }

    .session-hint {
      margin: 14px 0 0;
      color: #9CA3AF;
      font-size: 12px;
    }

    .empty-state,
    .complete-state {
      display: flex;
      min-height: 270px;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
    }

    .empty-icon {
      display: grid;
      place-items: center;
      width: 58px;
      height: 58px;
      border-radius: 14px;
      background: #EFF6FF;
      color: #2563EB;
    }

    .empty-icon svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .empty-state h2,
    .complete-state h2 {
      margin: 16px 0 0;
      color: #111827;
      font-size: 18px;
      font-weight: 600;
    }

    .empty-state p,
    .complete-state p {
      margin: 8px 0 0;
      max-width: 320px;
      color: #9CA3AF;
      font-size: 13px;
    }

    .checked-in-state {
      min-height: 270px;
    }

    .check-in-time {
      margin-top: 8px;
      color: #16A34A;
      font-size: 30px;
      font-weight: 600;
      letter-spacing: 0;
    }

    .elapsed-panel {
      margin-top: 22px;
      border: 1px solid #F1F5F9;
      border-radius: 14px;
      background: #F8FAFC;
      padding: 18px;
    }

    .elapsed-panel p {
      margin: 0;
      color: #9CA3AF;
      font-size: 12px;
      font-weight: 600;
    }

    .elapsed-panel strong,
    .complete-state strong {
      display: block;
      margin-top: 8px;
      color: #374151;
      font-size: 38px;
      font-weight: 500;
      letter-spacing: -0.5px;
    }

    .history-card,
    .percentage-card {
      padding: 20px;
    }

    .card-heading {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
    }

    .card-heading h2,
    .percentage-card h2 {
      color: #111827;
      font-size: 17px;
      font-weight: 600;
    }

    .card-heading p {
      margin-top: 5px;
      color: #9CA3AF;
      font-size: 13px;
    }

    .month-controls {
      display: flex;
      gap: 8px;
    }

    select {
      height: 38px;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #F9FAFB;
      color: #111827;
      padding: 0 32px 0 11px;
      font-size: 13px;
      outline: none;
    }

    select:focus {
      border-color: #2563EB;
      box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
    }

    table {
      width: 100%;
      min-width: 780px;
      border-collapse: collapse;
    }

    thead tr {
      background: #F9FAFB;
    }

    th {
      padding: 11px 14px;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-align: left;
      text-transform: uppercase;
    }

    td {
      padding: 13px 14px;
      border-bottom: 1px solid #F9FAFB;
      color: #4B5563;
      font-size: 13px;
    }

    tbody tr {
      animation: fadeSlideUp 180ms ease-out both;
    }

    tbody tr:nth-child(even) {
      background: #FAFAFA;
    }

    tbody tr:hover {
      background: #F5F9FF;
      box-shadow: inset 2px 0 0 #2563EB;
    }

    .table-empty {
      min-height: 220px;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      border-radius: 999px;
      padding: 0 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
    }

    .mode-pill {
      display: inline-flex;
      align-items: center;
      min-height: 22px;
      border-radius: 999px;
      padding: 0 10px;
      font-size: 11px;
      font-weight: 600;
      background: #F3F4F6;
      color: #4B5563;
    }

    .mode-pill[data-mode='office'] { background: #DBEAFE; color: #1D4ED8; }
    .mode-pill[data-mode='wfh']    { background: #FEF3C7; color: #92400E; }
    .mode-pill[data-mode='hybrid'] { background: #E9D5FF; color: #6B21A8; }

    .loc-text {
      font-size: 12px;
      color: #4B5563;
    }

    .loc-text.muted {
      color: #9CA3AF;
    }

    .status-present { background: #DCFCE7; color: #166534; }
    .status-late { background: #FEF3C7; color: #92400E; }
    .status-absent { background: #FEE2E2; color: #991B1B; }
    .status-wfh { background: #DBEAFE; color: #1D4ED8; }
    .status-default { background: #F3F4F6; color: #6B7280; }

    .summary-metrics {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
    }

    .summary-card,
    .wfh-card {
      border: 1px solid #F1F5F9;
      border-radius: 14px;
      background: #FFFFFF;
      padding: 18px;
    }

    .summary-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }

    .summary-card p,
    .wfh-card p {
      margin: 0;
      color: #9CA3AF;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .summary-icon {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      color: #4B5563;
      background: #F3F4F6;
    }

    .summary-card[data-tone='mint']  .summary-icon { color: #10B981; background: #ECFDF5; }
    .summary-card[data-tone='rose']  .summary-icon { color: #F43F5E; background: #FFE4E6; }
    .summary-card[data-tone='amber'] .summary-icon { color: #F59E0B; background: #FEF3C7; }
    .summary-card[data-tone='sky']   .summary-icon { color: #2563EB; background: #DBEAFE; }

    .summary-icon svg {
      width: 16px;
      height: 16px;
    }

    .summary-card strong,
    .wfh-card strong {
      display: block;
      margin-top: 14px;
      color: #111827;
      font-size: 30px;
      font-weight: 600;
      letter-spacing: 0;
      line-height: 1;
    }

    .summary-bar {
      margin-top: 16px;
      height: 6px;
      border-radius: 999px;
      background: #F3F4F6;
      overflow: hidden;
    }

    .summary-bar span {
      display: block;
      height: 100%;
      border-radius: 999px;
      background: #94A3B8;
      transition: width 200ms ease;
    }

    .summary-card[data-tone='mint']  .summary-bar span { background: #10B981; }
    .summary-card[data-tone='rose']  .summary-bar span { background: #F43F5E; }
    .summary-card[data-tone='amber'] .summary-bar span { background: #F59E0B; }
    .summary-card[data-tone='sky']   .summary-bar span { background: #2563EB; }

    .summary-hint {
      margin: 10px 0 0 !important;
      color: #6B7280 !important;
      font-size: 11px !important;
      font-weight: 500 !important;
    }

    .percentage-card {
      text-align: center;
    }

    .progress-ring {
      position: relative;
      width: 200px;
      height: 200px;
      margin: 20px auto 0;
    }

    .progress-ring svg {
      width: 200px;
      height: 200px;
      transform: rotate(-90deg);
    }

    .progress-ring > div {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .progress-ring strong {
      color: #111827;
      font-size: 36px;
      font-weight: 600;
    }

    .progress-ring span {
      margin-top: 3px;
      color: #9CA3AF;
      font-size: 12px;
    }

    .wfh-card {
      margin-top: 18px;
      text-align: left;
    }

    /* ===== Admin grid ===== */
    .admin-section {
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .admin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
    }

    .admin-header h1 {
      margin: 0;
      color: #111827;
      font-size: 22px;
      font-weight: 700;
    }

    .admin-actions {
      display: flex;
      gap: 10px;
    }

    .btn-ghost,
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 38px;
      padding: 0 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
    }

    .btn-ghost {
      border: 1px solid #E5E7EB;
      background: #FFFFFF;
      color: #374151;
    }

    .btn-ghost:hover {
      background: #F9FAFB;
    }

    .btn-primary {
      border: 0;
      background: #4A2D5F;
      color: #FFFFFF;
    }

    .btn-primary:hover {
      background: #3B244B;
    }

    .btn-ghost svg,
    .btn-primary svg {
      width: 15px;
      height: 15px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .admin-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .legend {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      color: #4B5563;
      font-size: 12px;
      font-weight: 500;
    }

    .legend .dot,
    .cell-dot {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 999px;
      background: #E5E7EB;
    }

    .legend .dot.present,
    .cell-dot[data-status='present'] { background: #22C55E; }
    .legend .dot.half,
    .cell-dot[data-status='half']    { background: #F59E0B; }
    .legend .dot.absent,
    .cell-dot[data-status='absent']  { background: #EF4444; }
    .cell-dot[data-status='none']    { background: #E5E7EB; }

    .admin-grid-card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .grid-loading,
    .grid-empty {
      padding: 40px 20px;
      text-align: center;
      color: #6B7280;
      font-size: 13px;
    }

    .grid-scroll {
      overflow-x: auto;
    }

    .admin-grid {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      min-width: 720px;
    }

    .admin-grid thead th {
      position: sticky;
      top: 0;
      background: #FFFFFF;
      padding: 14px 6px;
      color: #9CA3AF;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      border-bottom: 1px solid #F3F4F6;
    }

    .admin-grid th.col-name,
    .admin-grid td.col-name {
      position: sticky;
      left: 0;
      z-index: 1;
      min-width: 160px;
      padding: 12px 16px;
      text-align: left;
      background: #FFFFFF;
    }

    .admin-grid th.col-day {
      min-width: 30px;
      text-align: center;
    }

    .admin-grid td {
      padding: 10px 4px;
      text-align: center;
      border-bottom: 1px solid #F3F4F6;
    }

    .admin-grid td.col-name {
      color: #111827;
      font-size: 13px;
      font-weight: 500;
    }

    .admin-grid tr.zebra td {
      background: #FAFAFA;
    }

    .admin-grid tr.zebra td.col-name {
      background: #FAFAFA;
    }

    .admin-grid tbody tr:hover td {
      background: #F5F3FF;
    }

    .admin-grid tbody tr:hover td.col-name {
      background: #F5F3FF;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes attendanceRipple {
      from {
        opacity: 1;
        transform: scale(1);
      }
      to {
        opacity: 0;
        transform: scale(3);
      }
    }

    .back-btn {
      display: inline-grid;
      place-items: center;
      width: 28px;
      height: 28px;
      margin-right: 8px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      background: #FFFFFF;
      color: #374151;
      cursor: pointer;
      vertical-align: middle;
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

    .dir-scroll {
      overflow-x: auto;
    }

    .dir-table {
      width: 100%;
      border-collapse: collapse;
      min-width: 820px;
    }

    .dir-table thead tr {
      background: #F9FAFB;
    }

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

    .dir-avatar.large {
      width: 56px;
      height: 56px;
      font-size: 16px;
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

    .emp-summary-card {
      margin-bottom: 14px;
      padding: 16px;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .emp-summary-head {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .emp-summary-head img {
      width: 56px;
      height: 56px;
      border-radius: 999px;
      object-fit: cover;
    }

    .emp-summary-name {
      margin: 0;
      color: #111827;
      font-size: 16px;
      font-weight: 600;
    }

    .emp-summary-meta {
      margin: 4px 0 0;
      color: #6B7280;
      font-size: 12px;
      text-transform: capitalize;
    }

    .stat-tiles {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 10px;
      margin-top: 14px;
    }

    .stat-tile {
      padding: 12px;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    .stat-tile p {
      margin: 0;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .stat-tile strong {
      display: block;
      margin-top: 6px;
      color: #111827;
      font-size: 20px;
      font-weight: 700;
    }

    .stat-tile[data-tone="present"] strong { color: #16A34A; }
    .stat-tile[data-tone="half"] strong { color: #F59E0B; }
    .stat-tile[data-tone="late"] strong { color: #F97316; }
    .stat-tile[data-tone="wfh"] strong { color: #06B6D4; }
    .stat-tile[data-tone="leave"] strong { color: #A855F7; }
    .stat-tile[data-tone="absent"] strong { color: #DC2626; }
    .stat-tile[data-tone="hours"] strong { color: #2563EB; }

    .history-card {
      margin-top: 14px;
      border: 1px solid #E5E7EB;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      overflow: hidden;
    }

    .history-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 16px;
      border-bottom: 1px solid #E5E7EB;
      background: #F9FAFB;
    }

    .history-header h3 {
      margin: 0;
      color: #111827;
      font-size: 14px;
      font-weight: 600;
    }

    .history-header span {
      color: #9CA3AF;
      font-size: 12px;
    }

    .history-table {
      width: 100%;
      min-width: 760px;
      border-collapse: collapse;
    }

    .history-table thead tr { background: #FFFFFF; }

    .history-table th {
      padding: 11px 16px;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-align: left;
      text-transform: uppercase;
      border-bottom: 1px solid #F3F4F6;
    }

    .history-table td {
      padding: 12px 16px;
      color: #4B5563;
      font-size: 13px;
      border-bottom: 1px solid #F9FAFB;
    }

    .history-table tbody tr:hover { background: #F9FAFB; }

    .status-pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 600;
      text-transform: capitalize;
      background: #F3F4F6;
      color: #374151;
    }

    .status-pill[data-status="present"] { background: #DCFCE7; color: #166534; }
    .status-pill[data-status="half_day"] { background: #FEF3C7; color: #92400E; }
    .status-pill[data-status="late"] { background: #FFEDD5; color: #9A3412; }
    .status-pill[data-status="wfh"] { background: #CFFAFE; color: #155E75; }
    .status-pill[data-status="on_leave"] { background: #F3E8FF; color: #6B21A8; }
    .status-pill[data-status="absent"] { background: #FEE2E2; color: #991B1B; }

    .admin-profile-card {
      margin-top: 4px;
      margin-bottom: 14px;
      padding: 22px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 16px rgba(15, 23, 42, 0.04);
    }

    .profile-row {
      display: flex;
      align-items: center;
      gap: 18px;
      padding-bottom: 20px;
      border-bottom: 1px solid #F1F5F9;
    }

    .profile-avatar {
      display: grid;
      place-items: center;
      flex: 0 0 64px;
      width: 64px;
      height: 64px;
      border-radius: 999px;
      background: linear-gradient(135deg, #C084FC, #7E22CE);
      color: #FFFFFF;
      font-size: 22px;
      font-weight: 700;
      overflow: hidden;
    }

    .profile-avatar.has-image { background: #E5E7EB; }
    .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }

    .profile-info strong {
      display: block;
      color: #0F172A;
      font-size: 18px;
      font-weight: 700;
    }

    .profile-info .profile-title {
      display: block;
      margin-top: 2px;
      color: #64748B;
      font-size: 13px;
      text-transform: capitalize;
    }

    .profile-meta {
      list-style: none;
      margin: 8px 0 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 18px;
      font-size: 12px;
      color: #475569;
    }

    .profile-meta li em {
      display: inline-block;
      margin-right: 6px;
      color: #94A3B8;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      font-style: normal;
      text-transform: uppercase;
    }

    .metric-tiles {
      list-style: none;
      margin: 20px 0 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
    }

    .metric-tile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 18px;
      background: #F8FAFC;
      border: 1px solid #F1F5F9;
      border-radius: 12px;
    }

    .metric-text span {
      display: block;
      color: #94A3B8;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .metric-text strong {
      display: block;
      margin-top: 4px;
      color: #0F172A;
      font-size: 22px;
      font-weight: 800;
      line-height: 1;
    }

    .metric-dot {
      flex: 0 0 26px;
      width: 26px;
      height: 26px;
      border-radius: 999px;
    }

    @media (max-width: 900px) {
      .metric-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }

    @media (max-width: 520px) {
      .metric-tiles { grid-template-columns: 1fr; }
    }

    .admin-tabs-card {
      margin-top: 16px;
      padding: 22px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 16px rgba(15, 23, 42, 0.04);
    }

    .admin-subtabs {
      display: flex;
      gap: 24px;
      margin-bottom: 18px;
      padding: 0 4px;
      border-bottom: 1px solid #F1F5F9;
    }

    .admin-subtab {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 4px 12px;
      border: 0;
      background: transparent;
      color: #64748B;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      font-family: inherit;
    }

    .admin-subtab svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .admin-subtab:hover {
      color: #0F172A;
    }

    .admin-subtab.active {
      color: #2563EB;
      border-bottom-color: #2563EB;
    }

    .admin-today-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 14px;
    }

    .admin-today-card {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 16px 18px;
      background: #F8FAFC;
      border: 1px solid #F1F5F9;
      border-radius: 12px;
    }

    .admin-today-card .lbl {
      color: #94A3B8;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .admin-today-card strong {
      color: #0F172A;
      font-size: 18px;
      font-weight: 700;
    }

    .admin-empty-today {
      padding: 24px;
      text-align: center;
      color: #64748B;
      font-size: 13px;
    }

    .admin-summary-tiles {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
    }

    .admin-summary-tile {
      padding: 14px;
      background: #F8FAFC;
      border: 1px solid #F1F5F9;
      border-radius: 12px;
    }

    .admin-summary-tile span {
      display: block;
      color: #94A3B8;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }

    .admin-summary-tile strong {
      display: block;
      margin-top: 6px;
      color: #0F172A;
      font-size: 22px;
      font-weight: 800;
    }

    .admin-summary-tile[data-tone="present"] strong { color: #16A34A; }
    .admin-summary-tile[data-tone="late"] strong { color: #F97316; }
    .admin-summary-tile[data-tone="half"] strong { color: #F59E0B; }
    .admin-summary-tile[data-tone="wfh"] strong { color: #06B6D4; }
    .admin-summary-tile[data-tone="leave"] strong { color: #A855F7; }
    .admin-summary-tile[data-tone="absent"] strong { color: #DC2626; }
    .admin-summary-tile[data-tone="hours"] strong { color: #2563EB; }
    .admin-summary-tile[data-tone="avg"] strong { color: #7C3AED; }

    .admin-analytics-grid {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
      gap: 16px;
    }

    .admin-analytics-card {
      padding: 18px;
      background: #FFFFFF;
      border: 1px solid #F1F5F9;
      border-radius: 12px;
    }

    .admin-analytics-head h3 {
      margin: 0 0 14px;
      color: #0F172A;
      font-size: 13px;
      font-weight: 700;
    }

    .admin-distribution-chart {
      width: 100%;
      height: 280px;
    }

    .admin-ring-grid {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 18px;
    }

    .admin-ring-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .admin-ring-chart {
      width: 100%;
      height: 88px;
    }

    .admin-ring-label {
      color: #475569;
      font-size: 12px;
      font-weight: 600;
    }

    @media (max-width: 900px) {
      .admin-today-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .admin-summary-tiles { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .admin-analytics-grid { grid-template-columns: 1fr; }
    }

    @media (max-width: 520px) {
      .admin-today-grid { grid-template-columns: 1fr; }
      .admin-summary-tiles { grid-template-columns: 1fr; }
    }

    .admin-log-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }

    .admin-log-header h3 {
      margin: 0;
      color: #0F172A;
      font-size: 14px;
      font-weight: 700;
    }

    .admin-log-header .sample-tag {
      display: inline-flex;
      align-items: center;
      padding: 3px 9px;
      border-radius: 999px;
      background: #F5F3FF;
      color: #5B21B6;
      font-size: 11px;
      font-weight: 600;
    }

    .admin-log-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
    }

    .admin-log-table thead th {
      padding: 12px 14px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      letter-spacing: 0.06em;
      color: #94A3B8;
      background: transparent;
      border-bottom: 1px solid #E2E8F0;
      white-space: nowrap;
    }

    .admin-log-table tbody td {
      padding: 14px;
      border-bottom: 1px solid #F1F5F9;
      color: #1E293B;
      vertical-align: middle;
    }

    .admin-log-table tbody tr:hover {
      background: #F8FAFC;
    }

    .admin-log-table .actions-col {
      white-space: nowrap;
      text-align: left;
    }

    .row-delete {
      display: inline-grid;
      place-items: center;
      width: 30px;
      height: 30px;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #DC2626;
      cursor: pointer;
      transition: background-color 160ms ease;
    }

    .row-delete:hover {
      background: #FEE2E2;
    }

    .row-delete svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .admin-log-table .status-pill {
      padding: 4px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .admin-log-table .status-pill[data-status="Present"] { background: #DCFCE7; color: #15803D; }
    .admin-log-table .status-pill[data-status="Late"] { background: #FEF3C7; color: #B45309; }
    .admin-log-table .status-pill[data-status="Half Day"] { background: #DBEAFE; color: #1D4ED8; }
    .admin-log-table .status-pill[data-status="Leave"] { background: #FEE2E2; color: #B91C1C; }
    .admin-log-table .status-pill[data-status="WFH"] { background: #CFFAFE; color: #155E75; }
    .admin-log-table .status-pill[data-status="Absent"] { background: #FEE2E2; color: #991B1B; }

    @media (max-width: 900px) {
      .today-grid,
      .summary-grid {
        grid-template-columns: 1fr;
      }

      .page-header,
      .check-header,
      .card-heading {
        align-items: flex-start;
        flex-direction: column;
      }

      .stat-tiles {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }

    @media (max-width: 620px) {
      .attendance-page {
        padding: 16px;
      }

      .tab-list,
      .month-controls,
      .work-mode-grid,
      .summary-metrics {
        width: 100%;
      }

      .tab-list {
        overflow-x: auto;
      }

      .work-mode-grid,
      .summary-metrics {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class AttendanceComponent implements OnInit, OnDestroy {
  todayRecord: any = null;
  canCheckIn = false;
  canCheckOut = false;
  isLoading = false;
  workMode = 'office';
  selectedYear = new Date().getFullYear();
  selectedMonth = new Date().getMonth() + 1;
  monthlyRecords: any[] = [];
  monthlySummary: any = null;
  locationStatus: LocationStatus = 'getting';
  currentLocation: LocationData | null = null;
  activeTab: AttendanceTab = 'today';
  successMessage = '';
  errorMessage = '';
  currentTime = '';
  currentDateLabel = '';
  elapsedTime = '0h 0m';
  greeting = '';
  sessionStartLabel = '--:--';
  sessionElapsed = '0h 0m 0s';
  private sessionInterval: ReturnType<typeof setInterval> | null = null;

  tabs: AttendanceTab[] = ['today', 'history', 'summary'];
  adminRows: AdminRow[] = [];
  adminLoading = false;
  dayColumns: number[] = [];

  attendanceDir: EmployeeListItem[] = [];
  attendanceDirLoading = false;
  attendanceDirQuery = '';
  selectedAttendanceUser: EmployeeListItem | null = null;
  selectedUserRow: AdminRow | null = null;
  selectedUserRecords: any[] | null = null;
  selectedUserStats = { present: 0, half: 0, late: 0, wfh: 0, leave: 0, absent: 0, totalHours: '0.0' };
  selectedUserLoading = false;
  adminLogRows: AdminLogRow[] = [];
  adminLogUsingSample = false;
  adminMetricTiles = {
    avgHours: '08:00',
    shiftIn: '10:30 AM',
    avgOut: '07:30 PM',
    avgBreak: '01:00',
  };

  adminSubTab: AdminSubTab = 'today';
  adminTodayRow: AdminLogRow | null = null;
  adminSummaryStats: AdminSummaryStats = {
    present: 0, late: 0, half: 0, wfh: 0, leave: 0, absent: 0,
    totalHours: '00:00', avgHours: '00:00',
  };
  adminDistributionChart: EChartsOption = {};
  adminStatusRings: AdminStatusRing[] = [
    { label: 'Punctuality', value: 0, color: '#A855F7' },
    { label: 'Productivity', value: 0, color: '#22C55E' },
    { label: 'Engagement', value: 0, color: '#0EA5E9' },
    { label: 'Quality', value: 0, color: '#F97316' },
    { label: 'Attendance', value: 0, color: '#10B981' },
    { label: 'Reliability', value: 0, color: '#EC4899' },
  ];
  workModes = [
    { label: 'Office', value: 'office' },
    { label: 'WFH', value: 'wfh' },
    { label: 'Hybrid', value: 'hybrid' },
  ];
  months = [
    { label: 'January', value: 1 },
    { label: 'February', value: 2 },
    { label: 'March', value: 3 },
    { label: 'April', value: 4 },
    { label: 'May', value: 5 },
    { label: 'June', value: 6 },
    { label: 'July', value: 7 },
    { label: 'August', value: 8 },
    { label: 'September', value: 9 },
    { label: 'October', value: 10 },
    { label: 'November', value: 11 },
    { label: 'December', value: 12 },
  ];
  years = Array.from({ length: 5 }, (_, index) => this.selectedYear - 2 + index);

  private clockInterval: ReturnType<typeof setInterval> | null = null;
  private elapsedInterval: ReturnType<typeof setInterval> | null = null;
  private todayStatusSubscription?: Subscription;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private employeeService: EmployeeService,
    private router: Router,
  ) {}

  onTabClick(tab: AttendanceTab): void {
    this.activeTab = tab;
  }

  ngOnInit(): void {
    this.todayStatusSubscription = this.attendanceService.todayStatus$.subscribe((status: any) => {
      this.todayRecord = status?.attendance ?? null;
      this.canCheckIn = Boolean(status?.can_check_in);
      this.canCheckOut = Boolean(status?.can_check_out);
      this.updateElapsedTime();
    });

    this.attendanceService.getTodayStatus().subscribe({
      error: (error) => this.showError(error),
    });

    this.attendanceService.getLocation()
      .then((location) => {
        this.currentLocation = location;
        this.locationStatus = 'ready';
      })
      .catch(() => {
        this.currentLocation = null;
        this.locationStatus = 'failed';
      });

    this.loadMonthlyData(this.selectedYear, this.selectedMonth);
    this.updateClock();
    this.updateElapsedTime();
    this.updateSession();
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.elapsedInterval = setInterval(() => this.updateElapsedTime(), 60000);
    this.sessionInterval = setInterval(() => this.updateSession(), 1000);

    if (this.isAdminUser) {
      this.tabs = ['today', 'history', 'summary', 'admin'];
      this.activeTab = 'admin';
      this.loadOwnAttendance();
    }
  }

  private loadOwnAttendance(): void {
    const myId = localStorage.getItem('user_id');
    if (!myId) return;
    this.employeeService.getById(myId).subscribe({
      next: (emp) => {
        this.selectedAttendanceUser = emp as EmployeeListItem;
        this.loadSelectedUserGrid();
      },
      error: () => { /* fall through */ },
    });
  }

  get filteredAttendanceDir(): EmployeeListItem[] {
    const q = (this.attendanceDirQuery || '').trim().toLowerCase();
    if (!q) return this.attendanceDir;
    return this.attendanceDir.filter((e) =>
      (e.full_name || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q) ||
      (e.employee_id || '').toLowerCase().includes(q),
    );
  }

  loadAttendanceDirectory(): void {
    if (!this.isAdminUser) return;
    this.attendanceDirLoading = true;
    this.employeeService.getAll().subscribe({
      next: (list) => {
        this.attendanceDir = list || [];
        this.attendanceDirLoading = false;
      },
      error: () => {
        this.attendanceDir = [];
        this.attendanceDirLoading = false;
      },
    });
  }

  selectAttendanceUser(emp: EmployeeListItem): void {
    this.selectedAttendanceUser = emp;
    this.loadSelectedUserGrid();
  }

  clearSelectedAttendanceUser(): void {
    this.selectedAttendanceUser = null;
    this.selectedUserRow = null;
  }

  loadSelectedUserGrid(): void {
    if (!this.selectedAttendanceUser) return;
    const year = this.selectedYear;
    const month = this.selectedMonth;
    this.dayColumns = this.buildDayColumns(year, month);
    this.selectedUserLoading = true;
    this.selectedUserRow = null;
    this.selectedUserRecords = null;
    this.selectedUserStats = { present: 0, half: 0, late: 0, wfh: 0, leave: 0, absent: 0, totalHours: '0.0' };
    this.adminLogRows = [];
    this.adminLogUsingSample = false;

    this.attendanceService
      .getUserAttendance(this.selectedAttendanceUser.id, year, month)
      .pipe(catchError(() => of([] as any[])))
      .subscribe({
        next: (records) => {
          const recs = (records || []).slice().sort((a: any, b: any) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
          this.selectedUserRecords = recs;
          this.selectedUserRow = {
            userId: this.selectedAttendanceUser!.id,
            name: this.selectedAttendanceUser!.full_name || 'Unknown',
            cells: this.buildCells(this.dayColumns, recs),
          };
          this.selectedUserStats = this.computeUserStats(recs);
          if (recs.length === 0) {
            this.adminLogRows = this.buildSampleAdminLog(year, month);
            this.adminLogUsingSample = true;
            this.adminMetricTiles = {
              avgHours: '08:00',
              shiftIn: '10:30 AM',
              avgOut: '07:30 PM',
              avgBreak: '01:00',
            };
          } else {
            this.adminLogRows = recs.map((r: any) => this.toAdminLogRow(r));
            this.adminLogUsingSample = false;
            this.adminMetricTiles = this.computeMetricTiles(recs);
          }
          this.recomputeAdminTodayAndSummary();
          this.selectedUserLoading = false;
        },
        error: () => {
          this.selectedUserLoading = false;
        },
      });
  }

  get joinedDateLabel(): string {
    const value = (this.selectedAttendanceUser as any)?.created_at;
    if (!value) return '—';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  titleCaseRole(role: string | undefined | null): string {
    if (!role) return '';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  private computeMetricTiles(records: any[]): { avgHours: string; shiftIn: string; avgOut: string; avgBreak: string } {
    let hoursSum = 0;
    let inMinutes = 0;
    let outMinutes = 0;
    let inCount = 0;
    let outCount = 0;
    for (const r of records) {
      if (typeof r.total_hours === 'number') hoursSum += r.total_hours;
      if (r.check_in) {
        const dt = new Date(r.check_in);
        if (!Number.isNaN(dt.getTime())) {
          inMinutes += dt.getHours() * 60 + dt.getMinutes();
          inCount++;
        }
      }
      if (r.check_out) {
        const dt = new Date(r.check_out);
        if (!Number.isNaN(dt.getTime())) {
          outMinutes += dt.getHours() * 60 + dt.getMinutes();
          outCount++;
        }
      }
    }
    const avgH = records.length ? hoursSum / records.length : 0;
    const totalMins = Math.max(0, Math.round(avgH * 60));
    const hh = String(Math.floor(totalMins / 60)).padStart(2, '0');
    const mm = String(totalMins % 60).padStart(2, '0');
    return {
      avgHours: `${hh}:${mm}`,
      shiftIn: inCount ? this.formatClockAMPM(Math.round(inMinutes / inCount)) : '--:-- AM',
      avgOut: outCount ? this.formatClockAMPM(Math.round(outMinutes / outCount)) : '--:-- PM',
      avgBreak: '01:00',
    };
  }

  private formatClockAMPM(minutes: number): string {
    let hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
  }

  setAdminSubTab(t: AdminSubTab): void {
    this.adminSubTab = t;
  }

  private recomputeAdminTodayAndSummary(): void {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const key = `${dd}-${mm}-${yyyy}`;
    this.adminTodayRow = this.adminLogRows.find((r) => r.date === key) || null;

    const stats: AdminSummaryStats = { present: 0, late: 0, half: 0, wfh: 0, leave: 0, absent: 0, totalHours: '00:00', avgHours: '00:00' };
    let totalMins = 0;
    for (const r of this.adminLogRows) {
      switch (r.status) {
        case 'Present': stats.present++; break;
        case 'Late': stats.late++; break;
        case 'Half Day': stats.half++; break;
        case 'WFH': stats.wfh++; break;
        case 'Leave': stats.leave++; break;
        case 'Absent': stats.absent++; break;
      }
      const parts = (r.workingHours || '0:0').split(':');
      const hh = parseInt(parts[0], 10) || 0;
      const mm2 = parseInt(parts[1], 10) || 0;
      totalMins += hh * 60 + mm2;
    }
    const total = this.adminLogRows.length;
    stats.totalHours = this.adminMinutesToHHMM(totalMins);
    stats.avgHours = total ? this.adminMinutesToHHMM(Math.round(totalMins / total)) : '00:00';
    this.adminSummaryStats = stats;

    this.adminDistributionChart = this.buildAdminDistribution(stats);
    const attendance = total ? Math.round(((stats.present + stats.wfh) / total) * 100) : 0;
    const punctuality = total ? Math.round((stats.present / total) * 100) : 0;
    this.adminStatusRings = [
      { label: 'Punctuality', value: punctuality, color: '#A855F7' },
      { label: 'Productivity', value: attendance, color: '#22C55E' },
      { label: 'Engagement', value: attendance, color: '#0EA5E9' },
      { label: 'Quality', value: attendance, color: '#F97316' },
      { label: 'Attendance', value: attendance, color: '#10B981' },
      { label: 'Reliability', value: punctuality, color: '#EC4899' },
    ];
  }

  private buildAdminDistribution(stats: AdminSummaryStats): EChartsOption {
    const data = [
      { value: stats.present, name: 'Present', itemStyle: { color: '#22C55E' } },
      { value: stats.late, name: 'Late', itemStyle: { color: '#F59E0B' } },
      { value: stats.half, name: 'Half Day', itemStyle: { color: '#3B82F6' } },
      { value: stats.leave, name: 'Leave', itemStyle: { color: '#A855F7' } },
      { value: stats.absent, name: 'Absent', itemStyle: { color: '#EF4444' } },
      { value: stats.wfh, name: 'WFH', itemStyle: { color: '#06B6D4' } },
    ].filter((d) => d.value > 0);

    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: {
        orient: 'vertical',
        right: 8,
        top: 'middle',
        icon: 'roundRect',
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: '#475569', fontSize: 12 },
      },
      series: [
        {
          type: 'pie',
          radius: ['0%', '72%'],
          center: ['38%', '50%'],
          avoidLabelOverlap: false,
          label: { show: true, formatter: '{d}%', color: '#0F172A', fontSize: 11, fontWeight: 600 },
          labelLine: { length: 10, length2: 8 },
          data: data.length ? data : [{ value: 1, name: 'No data', itemStyle: { color: '#E5E7EB' } }],
        },
      ],
    };
  }

  adminRingOption(value: number, color: string): EChartsOption {
    return {
      series: [
        {
          type: 'pie',
          radius: ['72%', '92%'],
          avoidLabelOverlap: false,
          silent: true,
          label: { show: true, position: 'center', formatter: '{c}%', color: '#0F172A', fontSize: 14, fontWeight: 700 },
          labelLine: { show: false },
          data: [
            { value, itemStyle: { color }, label: { show: true } },
            { value: Math.max(0, 100 - value), itemStyle: { color: '#E2E8F0' }, label: { show: false } },
          ],
        },
      ],
    };
  }

  private adminMinutesToHHMM(total: number): string {
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private toAdminLogRow(r: any): AdminLogRow {
    const dt = new Date(r.date);
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return {
      date: `${dd}-${mm}-${yyyy}`,
      checkIn: this.formatLogClock(r.check_in),
      checkOut: this.formatLogClock(r.check_out),
      workingHours: this.formatLogHours(r.total_hours),
      shift: (r.work_mode || 'SHIFT 1').toString().toUpperCase(),
      status: this.mapLogStatus(r.status),
    };
  }

  private formatLogClock(value?: string | null): string {
    if (!value) return '–';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '–';
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  private formatLogHours(h?: number | null): string {
    if (h === null || h === undefined) return '00:00';
    const total = Math.max(0, Math.round(h * 60));
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private mapLogStatus(status: string): AdminLogRow['status'] {
    switch ((status || '').toLowerCase()) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'half_day': return 'Half Day';
      case 'on_leave': return 'Leave';
      case 'wfh': return 'WFH';
      default: return 'Absent';
    }
  }

  private buildSampleAdminLog(year: number, month: number): AdminLogRow[] {
    const monthIdx = month - 1;
    const today = new Date();
    const lastDay = new Date(year, monthIdx + 1, 0).getDate();
    const upTo = (year === today.getFullYear() && monthIdx === today.getMonth())
      ? Math.min(today.getDate(), lastDay)
      : lastDay;

    const rows: AdminLogRow[] = [];
    for (let day = upTo; day >= 1; day--) {
      const d = new Date(year, monthIdx, day);
      const dow = d.getDay();
      const dd = String(day).padStart(2, '0');
      const mm = String(monthIdx + 1).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${year}`;

      if (dow === 0 || dow === 6) {
        rows.push({ date: dateStr, checkIn: '–', checkOut: '–', workingHours: '00:00', shift: 'WEEKEND', status: 'Leave' });
        continue;
      }

      const pattern = day % 9;
      switch (pattern) {
        case 0:
          rows.push({ date: dateStr, checkIn: '11:00', checkOut: '04:30', workingHours: '05:30', shift: 'SHIFT 1', status: 'Late' });
          break;
        case 1:
          rows.push({ date: dateStr, checkIn: '10:30', checkOut: '03:30', workingHours: '05:00', shift: 'SHIFT 1', status: 'Half Day' });
          break;
        case 2:
          rows.push({ date: dateStr, checkIn: '–', checkOut: '–', workingHours: '00:00', shift: 'SHIFT 1', status: 'Leave' });
          break;
        case 3:
          rows.push({ date: dateStr, checkIn: '10:00', checkOut: '07:00', workingHours: '08:00', shift: 'WFH', status: 'WFH' });
          break;
        case 4:
          rows.push({ date: dateStr, checkIn: '–', checkOut: '–', workingHours: '00:00', shift: 'SHIFT 1', status: 'Absent' });
          break;
        default:
          rows.push({ date: dateStr, checkIn: '10:00', checkOut: '07:00', workingHours: '09:00', shift: 'SHIFT 1', status: 'Present' });
      }
    }
    return rows;
  }

  private computeUserStats(records: any[]): typeof this.selectedUserStats {
    const stats = { present: 0, half: 0, late: 0, wfh: 0, leave: 0, absent: 0, totalHours: '0.0' };
    let hours = 0;
    for (const r of records) {
      switch (r.status) {
        case 'present': stats.present++; break;
        case 'half_day': stats.half++; break;
        case 'late': stats.late++; break;
        case 'wfh': stats.wfh++; break;
        case 'on_leave': stats.leave++; break;
        case 'absent': stats.absent++; break;
      }
      if (typeof r.total_hours === 'number') hours += r.total_hours;
    }
    stats.totalHours = hours.toFixed(1);
    return stats;
  }

  formatHours(h: number | undefined | null): string {
    if (h === null || h === undefined) return '-';
    return Number(h).toFixed(2);
  }

  formatStatus(s: string | undefined | null): string {
    if (!s) return '-';
    return s.replace(/_/g, ' ');
  }

  avatarSrc(url: string | undefined | null): string {
    return resolveAvatarUrl(url);
  }

  getNameInitials(name: string | undefined): string {
    const parts = (name || 'User').trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p.charAt(0)).join('').toUpperCase();
  }

  get isAdminUser(): boolean {
    const role = (this.authService.getCurrentUser()?.role || localStorage.getItem('user_role') || '').toLowerCase();
    return role === 'admin' || role === 'hr';
  }

  loadAdminGrid(): void {
    if (!this.isAdminUser) {
      return;
    }

    const year = this.selectedYear;
    const month = this.selectedMonth;
    this.dayColumns = this.buildDayColumns(year, month);
    this.adminLoading = true;
    this.adminRows = [];

    this.attendanceService.getAllSummaries(year, month).subscribe({
      next: (summaries) => {
        if (!summaries || summaries.length === 0) {
          this.adminRows = [];
          this.adminLoading = false;
          return;
        }

        const requests = summaries.map((summary) =>
          this.attendanceService.getUserAttendance(summary.user_id, year, month).pipe(
            map((records) => ({
              userId: summary.user_id,
              name: summary.full_name || 'Unknown',
              cells: this.buildCells(this.dayColumns, records || []),
            })),
            catchError(() => of({
              userId: summary.user_id,
              name: summary.full_name || 'Unknown',
              cells: this.buildCells(this.dayColumns, []),
            } as AdminRow)),
          )
        );

        forkJoin(requests).subscribe({
          next: (rows) => {
            this.adminRows = rows;
            this.adminLoading = false;
          },
          error: (error) => {
            this.adminLoading = false;
            this.showError(error);
          },
        });
      },
      error: (error) => {
        this.adminLoading = false;
        this.showError(error);
      },
    });
  }

  private buildDayColumns(year: number, month: number): number[] {
    const lastDay = new Date(year, month, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => i + 1);
  }

  private buildCells(days: number[], records: any[]): CellStatus[] {
    const byDay = new Map<number, string>();
    for (const record of records) {
      const day = new Date(record.date).getDate();
      byDay.set(day, String(record.status || '').toLowerCase());
    }
    return days.map((day) => this.statusToCell(byDay.get(day)));
  }

  private statusToCell(status: string | undefined): CellStatus {
    if (status === 'present') return 'present';
    if (status === 'absent') return 'absent';
    if (status === 'late' || status === 'wfh' || status === 'half_day') return 'half';
    return 'none';
  }

  ngOnDestroy(): void {
    this.todayStatusSubscription?.unsubscribe();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
    }
    if (this.sessionInterval) {
      clearInterval(this.sessionInterval);
    }
  }

  private updateSession(): void {
    const stored = localStorage.getItem('login_at');
    const startMs = stored ? Number(stored) : Date.now();
    const start = new Date(startMs);
    this.sessionStartLabel = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffSec = Math.max(Math.floor((Date.now() - startMs) / 1000), 0);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    this.sessionElapsed = `${h}h ${m}m ${s}s`;
  }

  onCheckIn(): void {
    this.isLoading = true;
    this.clearMessages();

    this.attendanceService.checkIn(
      this.currentLocation?.lat,
      this.currentLocation?.lng,
      this.currentLocation?.city,
      this.currentLocation?.country,
      this.workMode,
    ).subscribe({
      next: (response: any) => {
        const status = response?.attendance?.status ?? response?.status ?? this.workMode;
        this.successMessage = `Checked in successfully. Status: ${status}`;
        this.isLoading = false;
        this.loadMonthlyData(this.selectedYear, this.selectedMonth);
      },
      error: (error) => {
        this.isLoading = false;
        this.showError(error);
      },
    });
  }

  onCheckOut(): void {
    this.isLoading = true;
    this.clearMessages();

    this.attendanceService.checkOut(
      this.currentLocation?.lat,
      this.currentLocation?.lng,
    ).subscribe({
      next: (response: any) => {
        const totalHours = response?.attendance?.total_hours ?? response?.total_hours ?? 0;
        this.successMessage = `Checked out successfully. Total hours: ${totalHours}h`;
        this.isLoading = false;
        this.loadMonthlyData(this.selectedYear, this.selectedMonth);
      },
      error: (error) => {
        this.isLoading = false;
        this.showError(error);
      },
    });
  }

  loadMonthlyData(year: number, month: number): void {
    this.attendanceService.getMyAttendance(year, month).subscribe({
      next: (records: any[]) => {
        this.monthlyRecords = records ?? [];
      },
      error: (error) => this.showError(error),
    });

    this.attendanceService.getMySummary(year, month).subscribe({
      next: (summary: any) => {
        this.monthlySummary = summary;
      },
      error: (error) => this.showError(error),
    });
  }

  get locationLabel(): string {
    if (this.locationStatus === 'ready') {
      return this.currentLocation?.source === 'ip' ? 'IP location used' : 'Location captured';
    }
    if (this.locationStatus === 'failed') {
      return 'Location unavailable';
    }
    return 'Getting location...';
  }

  get summaryMetrics(): { label: string; value: number | string; icon: string; tone: string; barPercent: number; hint: string }[] {
    const present = Number(this.monthlySummary?.present_days ?? 0);
    const absent = Number(this.monthlySummary?.absent_days ?? 0);
    const late = Number(this.monthlySummary?.late_days ?? 0);
    const totalHours = Number(this.monthlySummary?.total_hours ?? 0);
    const workingDays = Math.max(present + absent + late, 1);
    const expectedHours = workingDays * 8;
    return [
      {
        label: 'Present Days',
        value: present,
        icon: 'check',
        tone: 'mint',
        barPercent: Math.min((present / workingDays) * 100, 100),
        hint: `out of ${workingDays} working days`,
      },
      {
        label: 'Absent Days',
        value: absent,
        icon: 'x',
        tone: 'rose',
        barPercent: Math.min((absent / workingDays) * 100, 100),
        hint: absent === 0 ? 'Perfect attendance' : `${Math.round((absent / workingDays) * 100)}% missed`,
      },
      {
        label: 'Late Days',
        value: late,
        icon: 'clock',
        tone: 'amber',
        barPercent: Math.min((late / workingDays) * 100, 100),
        hint: late === 0 ? 'Always on time' : 'Aim for 0 next month',
      },
      {
        label: 'Total Hours',
        value: totalHours,
        icon: 'hourglass',
        tone: 'sky',
        barPercent: Math.min((totalHours / Math.max(expectedHours, 1)) * 100, 100),
        hint: `target ${expectedHours}h`,
      },
    ];
  }

  getSummaryIcon(name: string): string {
    const icons: Record<string, string> = {
      check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5 10 17.5 19 7.5"/></svg>',
      x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      hourglass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12"/><path d="M7 3c0 5 5 6 5 9 0-3 5-4 5-9"/><path d="M7 21c0-5 5-6 5-9 0 3 5 4 5 9"/></svg>',
    };
    return icons[name] || icons['check'];
  }

  get progressDasharray(): string {
    const circumference = 2 * Math.PI * 52;
    const percentage = Math.min(this.monthlySummary?.attendance_percentage ?? 0, 100);
    const filled = (percentage / 100) * circumference;
    return `${filled} ${circumference - filled}`;
  }

  formatTime(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleDateString([], {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatDuration(totalHours: number | null | undefined): string {
    if (totalHours == null) {
      return '0h 0m';
    }

    const totalMinutes = Math.max(Math.round(totalHours * 60), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  getDayName(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    return new Date(value).toLocaleDateString([], { weekday: 'long' });
  }

  formatMode(workMode: string | null | undefined): string {
    const mode = (workMode || 'office').toLowerCase();
    if (mode === 'wfh') return 'WFH';
    if (mode === 'hybrid') return 'Hybrid';
    return 'Office';
  }

  formatLocation(record: any): string {
    const parts = [record.city, record.country].filter(Boolean);
    return parts.length ? parts.join(', ') : '—';
  }

  getStatusClass(status: string): string {
    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus === 'present') {
      return 'status-badge status-present';
    }
    if (normalizedStatus === 'late') {
      return 'status-badge status-late';
    }
    if (normalizedStatus === 'absent') {
      return 'status-badge status-absent';
    }
    if (normalizedStatus === 'wfh') {
      return 'status-badge status-wfh';
    }
    return 'status-badge status-default';
  }

  private updateClock(): void {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    this.greeting = this.buildGreeting(now);
    this.currentDateLabel = now.toLocaleDateString([], {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  private updateElapsedTime(): void {
    if (!this.todayRecord?.check_in || this.todayRecord?.check_out) {
      this.elapsedTime = '0h 0m';
      return;
    }

    const checkInTime = new Date(this.todayRecord.check_in).getTime();
    if (Number.isNaN(checkInTime)) {
      this.elapsedTime = '0h 0m';
      return;
    }

    const diffMinutes = Math.max(Math.floor((Date.now() - checkInTime) / 60000), 0);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    this.elapsedTime = `${hours}h ${minutes}m`;
  }

  private buildGreeting(now: Date): string {
    const hour = now.getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
    const firstName = this.getEmployeeFirstName();
    return firstName ? `${greeting}, ${firstName}` : greeting;
  }

  private getEmployeeFirstName(): string {
    const fullName = this.authService.getCurrentUser()?.full_name ?? localStorage.getItem('full_name') ?? '';
    return String(fullName).trim().split(/\s+/)[0] ?? '';
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  private showError(error: any): void {
    const detail = error?.error?.detail;

    if (typeof detail === 'string') {
      this.errorMessage = detail;
      return;
    }

    if (Array.isArray(detail) && detail.length > 0) {
      this.errorMessage = detail[0]?.msg ?? 'Unable to load attendance';
      return;
    }

    this.errorMessage = error?.message ?? 'Unable to load attendance';
  }
}
