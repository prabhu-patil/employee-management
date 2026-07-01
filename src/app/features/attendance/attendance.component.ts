import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

type AttendanceTab = 'today' | 'history' | 'summary';
type LocationStatus = 'getting' | 'ready' | 'failed';

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
  imports: [CommonModule, FormsModule, EmptyStateComponent],
  template: `
    <main class="attendance-page">
      <section class="attendance-shell">
        <header class="page-header">
          <div>
            <p>Attendance</p>
            <h1>{{ greeting }}</h1>
            <span>Track check-in, check-out, and monthly attendance.</span>
          </div>

          <nav class="tab-list" aria-label="Attendance views">
            <button
              *ngFor="let tab of tabs"
              type="button"
              [class.active]="activeTab === tab"
              (click)="activeTab = tab"
            >
              {{ tab }}
            </button>
          </nav>
        </header>

        <div *ngIf="successMessage" class="notice success">{{ successMessage }}</div>
        <div *ngIf="errorMessage" class="notice error">{{ errorMessage }}</div>

        <section *ngIf="activeTab === 'today'" class="today-grid">
          <article class="check-card">
            <div class="check-header">
              <div>
                <p class="section-label">Current time</p>
                <div class="clock">{{ currentTime }}</div>
                <p class="date-label">{{ currentDateLabel }}</p>
              </div>

              <span class="location-badge" [class.gps]="locationStatus === 'ready' && currentLocation?.source === 'gps'" [class.ip]="locationStatus === 'ready' && currentLocation?.source === 'ip'" [class.requesting]="locationStatus !== 'ready'">
                <span *ngIf="locationStatus === 'getting'" class="mini-spinner"></span>
                <span *ngIf="locationStatus !== 'getting'" class="location-dot"></span>
                {{ locationLabel }}
              </span>
            </div>

            <div class="work-mode">
              <p class="section-label">Work mode</p>
              <div class="work-mode-grid">
                <label *ngFor="let mode of workModes" class="work-mode-pill" [class.active]="workMode === mode.value">
                  <input type="radio" name="workMode" [(ngModel)]="workMode" [value]="mode.value" [disabled]="!canCheckIn" />
                  <span>{{ mode.label }}</span>
                </label>
              </div>
            </div>

            <button
              type="button"
              class="primary-check-button ripple-button"
              [disabled]="!canCheckIn || isLoading"
              [class.loading]="isLoading && canCheckIn"
              (click)="onCheckIn()"
            >
              <span class="ripple-ring"></span>
              <span *ngIf="isLoading && canCheckIn" class="button-spinner"></span>
              <span>{{ isLoading && canCheckIn ? 'Checking in...' : 'Check In' }}</span>
            </button>
          </article>

          <article class="check-card status-card">
            <div *ngIf="!todayRecord" class="empty-state">
              <app-empty-state
                icon="calendar"
                title="No attendance data"
                description="Choose your work mode and check in to start today.">
              </app-empty-state>
            </div>

            <div *ngIf="todayRecord && canCheckOut" class="checked-in-state">
              <p class="section-label">Checked in at</p>
              <div class="check-in-time">{{ formatTime(todayRecord.check_in) }}</div>
              <div class="elapsed-panel">
                <p>Elapsed time</p>
                <strong>{{ elapsedTime }}</strong>
              </div>
              <button type="button" class="checkout-button ripple-button" [disabled]="isLoading" (click)="onCheckOut()">
                <span class="ripple-ring"></span>
                <span *ngIf="isLoading" class="button-spinner"></span>
                <span>{{ isLoading ? 'Checking out...' : 'Check Out' }}</span>
              </button>
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
                  <td>{{ record.location_verified ? 'Verified' : 'Not verified' }}</td>
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

        <section *ngIf="activeTab === 'summary'" class="summary-grid">
          <div class="summary-metrics">
            <article *ngFor="let metric of summaryMetrics" class="summary-card">
              <p>{{ metric.label }}</p>
              <strong>{{ metric.value }}</strong>
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

    .check-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
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
      cursor: pointer;
      transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
    }

    .work-mode-pill.active {
      border-color: #BFDBFE;
      background: #EFF6FF;
      color: #2563EB;
    }

    .work-mode-pill input {
      position: absolute;
      width: 1px;
      height: 1px;
      overflow: hidden;
      clip: rect(0 0 0 0);
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
      background: #F8FAFC;
      padding: 16px;
    }

    .summary-card p,
    .wfh-card p {
      margin: 0;
      color: #9CA3AF;
      font-size: 12px;
      font-weight: 600;
    }

    .summary-card strong,
    .wfh-card strong {
      display: block;
      margin-top: 10px;
      color: #111827;
      font-size: 30px;
      font-weight: 600;
      letter-spacing: 0;
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

  tabs: AttendanceTab[] = ['today', 'history', 'summary'];
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
  ) {}

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
    this.clockInterval = setInterval(() => this.updateClock(), 1000);
    this.elapsedInterval = setInterval(() => this.updateElapsedTime(), 60000);
  }

  ngOnDestroy(): void {
    this.todayStatusSubscription?.unsubscribe();
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
    }
    if (this.elapsedInterval) {
      clearInterval(this.elapsedInterval);
    }
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

  get summaryMetrics(): { label: string; value: number | string }[] {
    return [
      { label: 'Present Days', value: this.monthlySummary?.present_days ?? 0 },
      { label: 'Absent Days', value: this.monthlySummary?.absent_days ?? 0 },
      { label: 'Late Days', value: this.monthlySummary?.late_days ?? 0 },
      { label: 'Total Hours', value: this.monthlySummary?.total_hours ?? 0 },
    ];
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
