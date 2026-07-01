import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import * as L from 'leaflet';
import { Subscription } from 'rxjs';

import { DashboardService } from '../../core/services/dashboard.service';
import { CountUpDirective } from '../../core/directives/count-up.directive';

type Metric = {
  label: string;
  value: number;
  color: string;
  note: string;
  delay: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, CountUpDirective],
  template: `
    <main class="dashboard-page bg-surface-page">
      <header class="dashboard-header">
        <div>
          <p class="eyebrow">Employee Management</p>
          <h1>Dashboard</h1>
        </div>
        <p class="header-meta">Live employee, attendance, and department overview</p>
      </header>

      <section class="metrics-grid" aria-label="Dashboard metrics">
        <article
          *ngFor="let metric of metrics"
          class="metric-card animate-fade-up"
          [style.animation-delay]="metric.delay"
        >
          <p>{{ metric.label }}</p>
          <strong [style.color]="metric.color" [countUp]="metric.value"></strong>
          <span>{{ metric.note }}</span>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="dashboard-card chart-card">
          <div class="card-heading">
            <div>
              <h2>Weekly Attendance</h2>
              <p>Present, late, and absent counts for the last 7 days.</p>
            </div>
          </div>

          <apx-chart
            *ngIf="weeklyChartOptions"
            [series]="weeklyChartOptions.series"
            [chart]="weeklyChartOptions.chart"
            [xaxis]="weeklyChartOptions.xaxis"
            [colors]="weeklyChartOptions.colors"
            [plotOptions]="weeklyChartOptions.plotOptions"
            [grid]="weeklyChartOptions.grid"
            [tooltip]="weeklyChartOptions.tooltip"
            [dataLabels]="weeklyChartOptions.dataLabels"
            [legend]="weeklyChartOptions.legend"
            [yaxis]="weeklyChartOptions.yaxis">
          </apx-chart>
        </article>

        <article class="dashboard-card chart-card">
          <div class="card-heading">
            <div>
              <h2>Department Breakdown</h2>
              <p>Active employees grouped by department.</p>
            </div>
          </div>

          <apx-chart
            *ngIf="departmentChartOptions"
            [series]="departmentChartOptions.series"
            [chart]="departmentChartOptions.chart"
            [labels]="departmentChartOptions.labels"
            [colors]="departmentChartOptions.colors"
            [legend]="departmentChartOptions.legend"
            [dataLabels]="departmentChartOptions.dataLabels"
            [tooltip]="departmentChartOptions.tooltip"
            [stroke]="departmentChartOptions.stroke">
          </apx-chart>
        </article>
      </section>

      <section class="dashboard-grid lower-grid">
        <article class="dashboard-card departments-card">
          <div class="card-heading">
            <div>
              <h2>Departments Today</h2>
              <p>Present count compared with department size.</p>
            </div>
          </div>

          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Department</th>
                  <th>Employees</th>
                  <th>Present</th>
                  <th>Rate</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let department of departments">
                  <td>{{ getDepartmentName(department) }}</td>
                  <td>{{ getDepartmentTotal(department) }}</td>
                  <td>{{ getDepartmentPresent(department) }}</td>
                  <td>
                    <div class="rate-cell">
                      <span class="rate-track">
                        <span [style.width.%]="getDepartmentRate(department)"></span>
                      </span>
                      {{ getDepartmentRate(department) }}%
                    </div>
                  </td>
                </tr>
                <tr *ngIf="departments.length === 0">
                  <td colspan="4" class="empty-row">No department data available.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>

        <article class="dashboard-card map-card">
          <div class="card-heading">
            <div>
              <h2>Employee Login Locations</h2>
              <p>Latest employee sign-ins on a light map.</p>
            </div>
          </div>

          <div class="map-container">
            <div #loginMap class="leaflet-map" aria-label="Employee login locations map"></div>
          </div>
        </article>
      </section>
    </main>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100%;
      color: #111827;
    }

    .bg-surface-page,
    .dashboard-page {
      background: #F7F9FC;
    }

    .dashboard-page {
      min-height: 100vh;
      padding: 24px;
    }

    .dashboard-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 18px;
    }

    .eyebrow,
    .dashboard-header h1,
    .header-meta,
    .card-heading h2,
    .card-heading p,
    .metric-card p,
    .metric-card span {
      margin: 0;
    }

    .eyebrow {
      color: #2563EB;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .dashboard-header h1 {
      margin-top: 5px;
      color: #111827;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0;
      line-height: 1.15;
    }

    .header-meta {
      color: #6B7280;
      font-size: 13px;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 16px;
    }

    .metric-card {
      min-height: 124px;
      padding: 14px;
      border: 0;
      border-radius: 12px;
      background: #F8FAFC;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .metric-card p {
      color: #6B7280;
      font-size: 12px;
      font-weight: 600;
    }

    .metric-card strong {
      display: block;
      margin-top: 14px;
      font-size: 32px;
      font-weight: 700;
      line-height: 1;
      letter-spacing: 0;
    }

    .metric-card span {
      display: block;
      margin-top: 10px;
      color: #9CA3AF;
      font-size: 12px;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .lower-grid {
      grid-template-columns: minmax(0, 1.05fr) minmax(360px, 0.95fr);
    }

    .dashboard-card {
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    }

    .chart-card,
    .departments-card,
    .map-card {
      padding: 18px;
    }

    .card-heading {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      margin-bottom: 16px;
    }

    .card-heading h2 {
      color: #111827;
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 0;
    }

    .card-heading p {
      margin-top: 5px;
      color: #6B7280;
      font-size: 12px;
    }

    .table-wrap {
      overflow-x: auto;
    }

    table {
      width: 100%;
      min-width: 620px;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }

    th {
      padding: 10px 12px;
      border-bottom: 1px solid #E5E7EB;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    td {
      padding: 13px 12px;
      border-bottom: 1px solid #F1F5F9;
      color: #374151;
    }

    tbody tr:last-child td {
      border-bottom: 0;
    }

    .empty-row {
      color: #9CA3AF;
      text-align: center;
    }

    .rate-cell {
      display: flex;
      align-items: center;
      gap: 9px;
      color: #6B7280;
      white-space: nowrap;
    }

    .rate-track {
      display: block;
      width: 88px;
      height: 7px;
      overflow: hidden;
      border-radius: 999px;
      background: #F1F5F9;
    }

    .rate-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: #2563EB;
    }

    .map-container {
      height: 336px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
    }

    .leaflet-map {
      width: 100%;
      height: 100%;
      background: #FFFFFF;
    }

    :host ::ng-deep .apexcharts-canvas,
    :host ::ng-deep .apexcharts-svg {
      background: transparent !important;
    }

    :host ::ng-deep .apexcharts-tooltip {
      border: 1px solid #E5E7EB !important;
      border-radius: 10px !important;
      background: #FFFFFF !important;
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14) !important;
      color: #111827 !important;
    }

    :host ::ng-deep .apexcharts-tooltip-title {
      border-bottom: 1px solid #E5E7EB !important;
      background: #F8FAFC !important;
      color: #111827 !important;
    }

    :host ::ng-deep .leaflet-container {
      background: #FFFFFF;
      font-family: Inter, sans-serif;
    }

    :host ::ng-deep .leaflet-control-attribution {
      font-size: 10px;
    }

    @media (max-width: 1100px) {
      .metrics-grid,
      .dashboard-grid,
      .lower-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 760px) {
      .dashboard-page {
        padding: 16px;
      }

      .dashboard-header {
        align-items: flex-start;
        flex-direction: column;
      }

      .metrics-grid,
      .dashboard-grid,
      .lower-grid {
        grid-template-columns: 1fr;
      }

      .map-container {
        height: 280px;
      }
    }
  `],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('loginMap') loginMapRef?: ElementRef<HTMLElement>;

  metrics: Metric[] = this.buildMetrics({});
  weeklyChartOptions: any;
  departmentChartOptions: any;
  departments: any[] = [];
  recentLogins: any[] = [];

  private subscriptions = new Subscription();
  private map?: L.Map;
  private markers = L.layerGroup();
  private mapReady = false;

  constructor(private dashboardService: DashboardService) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.dashboardService.stats$.subscribe((stats) => {
        this.metrics = this.buildMetrics(stats || {});
      }),
    );

    this.subscriptions.add(
      this.dashboardService.getWeeklyAttendance().subscribe((data) => {
        this.buildWeeklyChart(data || {});
      }),
    );

    this.subscriptions.add(
      this.dashboardService.getDepartmentBreakdown().subscribe((data) => {
        const payload: any = data;
        this.departments = Array.isArray(payload) ? payload : payload?.departments || [];
        this.buildDepartmentChart(this.departments);
      }),
    );

    this.subscriptions.add(
      this.dashboardService.getRecentLogins().subscribe((data) => {
        const payload: any = data;
        this.recentLogins = Array.isArray(payload) ? payload : payload?.items || [];
        this.renderMarkers();
      }),
    );
  }

  ngAfterViewInit(): void {
    this.initializeMap();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.map?.remove();
  }

  getDepartmentName(department: any): string {
    return department.department_name || department.name || department.department || 'Unassigned';
  }

  getDepartmentTotal(department: any): number {
    return Number(department.total_employees ?? department.totalEmployees ?? department.employees ?? 0);
  }

  getDepartmentPresent(department: any): number {
    return Number(department.present_today ?? department.presentToday ?? department.present ?? 0);
  }

  getDepartmentRate(department: any): number {
    const total = this.getDepartmentTotal(department);
    return total ? Math.round((this.getDepartmentPresent(department) / total) * 100) : 0;
  }

  private buildMetrics(stats: any): Metric[] {
    return [
      {
        label: 'Total Employees',
        value: Number(stats.totalEmployees ?? stats.total_employees ?? 0),
        color: '#2563EB',
        note: `${Number(stats.newEmployeesThisMonth ?? stats.new_employees_this_month ?? 0)} new this month`,
        delay: '0ms',
      },
      {
        label: 'Present Today',
        value: Number(stats.presentToday ?? stats.present_today ?? 0),
        color: '#16A34A',
        note: `${Number(stats.attendancePercentage ?? stats.attendance_percentage_today ?? 0)}% attendance rate`,
        delay: '80ms',
      },
      {
        label: 'On Leave',
        value: Number(stats.onLeave ?? stats.on_leave_today ?? 0),
        color: '#D97706',
        note: `${Number(stats.pendingLeaves ?? stats.pending_leaves ?? 0)} pending requests`,
        delay: '160ms',
      },
      {
        label: 'Late Today',
        value: Number(stats.lateToday ?? stats.late_today ?? 0),
        color: '#DC2626',
        note: `${Number(stats.wfhCount ?? stats.wfh_today ?? 0)} working from home`,
        delay: '240ms',
      },
    ];
  }

  private buildWeeklyChart(data: any): void {
    const categories = Array.isArray(data)
      ? data.map((item) => this.formatWeekday(item.date))
      : data.dates || [];

    const present = Array.isArray(data) ? data.map((item) => item.present || 0) : data.present || [];
    const late = Array.isArray(data) ? data.map((item) => item.late || 0) : data.late || [];
    const absent = Array.isArray(data) ? data.map((item) => item.absent || 0) : data.absent || [];

    this.weeklyChartOptions = {
      series: [
        { name: 'Present', data: present },
        { name: 'Late', data: late },
        { name: 'Absent', data: absent },
      ],
      chart: {
        type: 'bar',
        height: 310,
        stacked: true,
        background: 'transparent',
        foreColor: '#9CA3AF',
        toolbar: { show: false },
      },
      colors: ['#16A34A', '#DC2626', '#D97706'],
      dataLabels: { enabled: false },
      grid: {
        borderColor: '#F1F5F9',
        strokeDashArray: 4,
      },
      legend: {
        position: 'top',
        horizontalAlign: 'right',
        labels: { colors: '#6B7280' },
      },
      plotOptions: {
        bar: {
          borderRadius: 5,
          borderRadiusApplication: 'end',
          columnWidth: '46%',
        },
      },
      tooltip: {
        theme: 'light',
      },
      xaxis: {
        categories,
        labels: { style: { colors: '#9CA3AF' } },
        axisBorder: { color: '#F1F5F9' },
        axisTicks: { color: '#F1F5F9' },
      },
      yaxis: {
        labels: { style: { colors: '#9CA3AF' } },
      },
    };
  }

  private buildDepartmentChart(data: any[]): void {
    this.departmentChartOptions = {
      series: data.map((item) => this.getDepartmentTotal(item)),
      chart: {
        type: 'donut',
        height: 310,
        background: 'transparent',
        foreColor: '#9CA3AF',
      },
      colors: ['#2563EB', '#16A34A', '#D97706', '#DC2626', '#0891B2', '#7C3AED'],
      dataLabels: { enabled: true },
      labels: data.map((item) => this.getDepartmentName(item)),
      legend: {
        position: 'bottom',
        labels: { colors: '#6B7280' },
      },
      stroke: {
        colors: ['#FFFFFF'],
        width: 3,
      },
      tooltip: {
        theme: 'light',
      },
    };
  }

  private initializeMap(): void {
    if (!this.loginMapRef || this.mapReady) {
      return;
    }

    this.map = L.map(this.loginMapRef.nativeElement, {
      center: [20.5937, 78.9629],
      zoom: 4,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(this.map);

    this.markers.addTo(this.map);
    this.mapReady = true;
    this.renderMarkers();

    setTimeout(() => this.map?.invalidateSize(), 0);
  }

  private renderMarkers(): void {
    if (!this.mapReady || !this.map) {
      return;
    }

    this.markers.clearLayers();

    const points = this.recentLogins
      .map((login) => ({
        lat: Number(login.latitude ?? login.lat),
        lng: Number(login.longitude ?? login.lng ?? login.lon),
        name: login.name || login.full_name || 'Employee',
        place: [login.city, login.country].filter(Boolean).join(', '),
      }))
      .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

    points.forEach((point) => {
      L.circleMarker([point.lat, point.lng], {
        radius: 7,
        color: '#2563EB',
        weight: 2,
        fillColor: '#60A5FA',
        fillOpacity: 0.85,
      })
        .bindPopup(`<strong>${point.name}</strong>${point.place ? `<br>${point.place}` : ''}`)
        .addTo(this.markers);
    });

    if (points.length) {
      const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng] as [number, number]));
      this.map.fitBounds(bounds.pad(0.25), { maxZoom: 8 });
    }
  }

  private formatWeekday(date: string): string {
    if (!date) {
      return '';
    }

    return new Date(date).toLocaleDateString(undefined, { weekday: 'short' });
  }
}
