import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

import {
  DashboardService,
  DashboardStats,
  DepartmentBreakdown,
  RecentLogin,
  WeeklyAttendance,
} from '../../core/services/dashboard.service';

type Kpi = {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  accent: string;
  spark: EChartsOption;
};

type SummaryStat = {
  label: string;
  value: string;
  iconBg: string;
  iconColor: string;
  icon: 'users' | 'check' | 'rocket';
};

type AttendanceStat = {
  label: string;
  value: string;
  bg: string;
  color: string;
};

type DeptCard = {
  name: string;
  count: number;
  pct: number;
  color: string;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  readonly stats = signal<DashboardStats | null>(null);
  readonly weekly = signal<WeeklyAttendance[]>([]);
  readonly departments = signal<DepartmentBreakdown[]>([]);
  readonly recentLogins = signal<RecentLogin[]>([]);

  readonly kpis = signal<Kpi[]>([]);
  readonly summary = signal<SummaryStat[]>([]);
  readonly deptCards = signal<DeptCard[]>([]);
  readonly attendanceStats = signal<AttendanceStat[]>([]);
  readonly weeklyChart = signal<EChartsOption>({});
  readonly pieChart = signal<EChartsOption>({});
  readonly horizontalChart = signal<EChartsOption>({});
  readonly satisfaction = signal<number>(92);

  private readonly deptOrder = ['HR', 'Engineering', 'Marketing', 'Finance', 'Operations', 'Others'];
  private readonly deptColors: Record<string, string> = {
    HR: '#22C55E',
    Engineering: '#3B82F6',
    Marketing: '#FACC15',
    Finance: '#A855F7',
    Operations: '#F97316',
    Others: '#64748B',
  };

  private readonly mockDepartments: DepartmentBreakdown[] = [
    { department_name: 'HR', total_employees: 15, present_today: 13 },
    { department_name: 'Engineering', total_employees: 78, present_today: 71 },
    { department_name: 'Marketing', total_employees: 42, present_today: 38 },
    { department_name: 'Finance', total_employees: 30, present_today: 27 },
    { department_name: 'Operations', total_employees: 65, present_today: 60 },
    { department_name: 'Others', total_employees: 26, present_today: 22 },
  ];

  private readonly mockStats: DashboardStats = {
    total_employees: 256,
    present_today: 215,
    absent_today: 12,
    late_today: 9,
    on_leave_today: 8,
    wfh_today: 12,
    pending_leaves: 4,
    new_employees_this_month: 21,
    attendance_percentage_today: 84,
  };

  private readonly mockWeekly: WeeklyAttendance[] = (() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      const seed = (i + 1) * 7;
      return {
        date: d.toISOString().slice(0, 10),
        present: 180 + (seed % 25),
        absent: 5 + (seed % 7),
        late: 4 + (seed % 5),
        wfh: 8 + (seed % 6),
      };
    });
  })();

  constructor(private dashboardService: DashboardService, private router: Router) {}

  viewFullHistory(): void {
    this.router.navigate(['/attendance']);
  }

  generateReport(): void {
    const stats = this.stats();
    const weekly = this.weekly();
    const depts = this.deptCards();
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString();

    const weeklyRows = weekly
      .map((r) => {
        const day = new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `<tr><td>${day}</td><td>${fmt(r.present)}</td><td>${fmt(r.late)}</td><td>${fmt(r.absent)}</td><td>${fmt(r.wfh)}</td></tr>`;
      })
      .join('');

    const deptRows = depts
      .map(
        (d) => `<tr>
          <td><span class="dot" style="background:${d.color}"></span>${d.name}</td>
          <td>${fmt(d.count)}</td>
          <td>${d.pct}%</td>
        </tr>`,
      )
      .join('');

    const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<title>Attendance Report - ${dateStr}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, Segoe UI, sans-serif; color: #0F172A; margin: 0; padding: 24px; background: #FFFFFF; }
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 16px; border-bottom: 2px solid #2563EB; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 800; letter-spacing: 0.04em; color: #0F172A; }
  .brand small { display: block; font-size: 11px; font-weight: 500; color: #64748B; letter-spacing: 0.06em; margin-top: 2px; }
  .meta { text-align: right; font-size: 12px; color: #64748B; line-height: 1.5; }
  .meta strong { color: #0F172A; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { color: #64748B; font-size: 13px; margin-bottom: 24px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { padding: 14px 16px; border: 1px solid #E2E8F0; border-radius: 8px; }
  .kpi span { display: block; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
  .kpi strong { display: block; font-size: 22px; font-weight: 800; margin-top: 6px; color: #0F172A; }
  h2 { font-size: 14px; margin: 24px 0 10px; padding-bottom: 6px; border-bottom: 1px solid #E2E8F0; color: #0F172A; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #F1F5F9; }
  th { background: #F8FAFC; font-weight: 700; color: #475569; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { color: #1E293B; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 999px; margin-right: 8px; vertical-align: middle; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #94A3B8; text-align: center; }
  @media print { body { padding: 0; } .no-print { display: none !important; } }
  .toolbar { position: fixed; top: 16px; right: 16px; display: flex; gap: 8px; }
  .toolbar button { padding: 8px 14px; border: 1px solid #CBD5E1; background: #FFFFFF; color: #1E293B; border-radius: 8px; font-weight: 600; font-size: 12px; cursor: pointer; }
  .toolbar button.primary { background: #2563EB; color: #FFFFFF; border-color: #2563EB; }
</style>
</head><body>
  <div class="toolbar no-print">
    <button class="primary" onclick="window.print()">Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>

  <div class="header">
    <div class="brand">AGENT LABS<small>HR · ATTENDANCE REPORT</small></div>
    <div class="meta"><strong>Generated:</strong> ${dateStr}<br><strong>Report:</strong> Weekly Attendance Summary</div>
  </div>

  <h1>Attendance Report</h1>
  <p class="subtitle">Snapshot of workforce attendance and department distribution.</p>

  <div class="kpi-grid">
    <div class="kpi"><span>Total Employees</span><strong>${fmt(stats?.total_employees)}</strong></div>
    <div class="kpi"><span>Present Today</span><strong>${fmt(stats?.present_today)}</strong></div>
    <div class="kpi"><span>Absent Today</span><strong>${fmt(stats?.absent_today)}</strong></div>
    <div class="kpi"><span>On Leave</span><strong>${fmt(stats?.on_leave_today)}</strong></div>
  </div>

  <h2>Weekly Attendance Breakdown</h2>
  <table>
    <thead><tr><th>Day</th><th>Present</th><th>Late</th><th>Absent</th><th>WFH</th></tr></thead>
    <tbody>${weeklyRows || '<tr><td colspan="5" style="text-align:center;color:#94A3B8">No data available</td></tr>'}</tbody>
  </table>

  <h2>Department Distribution</h2>
  <table>
    <thead><tr><th>Department</th><th>Employees</th><th>Share</th></tr></thead>
    <tbody>${deptRows || '<tr><td colspan="3" style="text-align:center;color:#94A3B8">No data available</td></tr>'}</tbody>
  </table>

  <div class="footer">AGENT LABS HR System · Confidential · Generated on ${dateStr}</div>

  <script>setTimeout(function(){ window.print(); }, 350);</script>
</body></html>`;

    const win = window.open('', '_blank', 'width=900,height=1100');
    if (!win) {
      alert('Please allow pop-ups for this site to download the report.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.dashboardService.getStats().subscribe({
      next: (s) => {
        const safe = this.isStatsEmpty(s) ? this.mockStats : s;
        this.stats.set(safe);
        this.buildKpis(safe);
        this.buildSummary(safe);
        this.buildAttendanceStats(safe);
      },
      error: () => {
        this.stats.set(this.mockStats);
        this.buildKpis(this.mockStats);
        this.buildSummary(this.mockStats);
        this.buildAttendanceStats(this.mockStats);
      },
    });

    this.dashboardService.getWeeklyAttendance().subscribe({
      next: (rows) => {
        const safe = rows.length === 0 || rows.every((r) => r.present + r.absent + r.late + r.wfh === 0)
          ? this.mockWeekly
          : rows;
        this.weekly.set(safe);
        this.buildWeeklyChart(safe);
      },
      error: () => {
        this.weekly.set(this.mockWeekly);
        this.buildWeeklyChart(this.mockWeekly);
      },
    });

    this.dashboardService.getDepartmentBreakdown().subscribe({
      next: (rows) => {
        const safe = rows.length === 0 ? this.mockDepartments : rows;
        this.departments.set(safe);
        this.buildDeptCards(safe);
        this.buildPie(safe);
        this.buildHorizontal(safe);
      },
      error: () => {
        this.departments.set(this.mockDepartments);
        this.buildDeptCards(this.mockDepartments);
        this.buildPie(this.mockDepartments);
        this.buildHorizontal(this.mockDepartments);
      },
    });

    this.dashboardService.getRecentLogins().subscribe({
      next: (rows) => this.recentLogins.set(rows.slice(0, 5)),
      error: () => this.recentLogins.set([]),
    });
  }

  private isStatsEmpty(s: DashboardStats | null): boolean {
    if (!s) return true;
    return (s.total_employees ?? 0) === 0;
  }

  private buildKpis(s: DashboardStats): void {
    const sparkData = (seed: number) =>
      Array.from({ length: 12 }, (_, i) => Math.max(0, Math.round(seed + Math.sin(i / 1.6) * (seed / 4))));

    const makeSpark = (data: number[], color: string): EChartsOption => ({
      grid: { left: 0, right: 0, top: 6, bottom: 4 },
      xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map((_, i) => String(i)) },
      yAxis: { type: 'value', show: false },
      series: [
        {
          type: 'line',
          smooth: true,
          showSymbol: false,
          lineStyle: { color, width: 2 },
          areaStyle: { color: color + '22' },
          data,
        },
      ],
    });

    this.kpis.set([
      {
        label: 'Total Employees',
        value: String(s.total_employees ?? 0),
        delta: `+${s.new_employees_this_month ?? 0} this month`,
        deltaPositive: true,
        accent: '#10B981',
        spark: makeSpark(sparkData(Math.max(s.total_employees, 8)), '#10B981'),
      },
      {
        label: 'Attendance Rate',
        value: `${s.attendance_percentage_today ?? 0}%`,
        delta: `${s.present_today ?? 0} present today`,
        deltaPositive: (s.attendance_percentage_today ?? 0) >= 70,
        accent: '#3B82F6',
        spark: makeSpark(sparkData(Math.max(s.attendance_percentage_today, 10)), '#3B82F6'),
      },
      {
        label: 'Pending Leaves',
        value: String(s.pending_leaves ?? 0),
        delta: `${s.on_leave_today ?? 0} on leave today`,
        deltaPositive: (s.pending_leaves ?? 0) === 0,
        accent: '#F59E0B',
        spark: makeSpark(sparkData(Math.max(s.pending_leaves * 2, 5)), '#F59E0B'),
      },
    ]);
  }

  private buildSummary(s: DashboardStats): void {
    const total = s.total_employees ?? 0;
    const active = s.present_today ?? Math.round(total * 0.92);
    const contractors = s.new_employees_this_month ?? 21;

    this.summary.set([
      { label: 'Total Employees', value: String(total), iconBg: '#3B82F6', iconColor: '#FFFFFF', icon: 'users' },
      { label: 'Active Employees', value: String(active), iconBg: '#22C55E', iconColor: '#FFFFFF', icon: 'check' },
      { label: 'Contractors', value: String(contractors), iconBg: '#F97316', iconColor: '#FFFFFF', icon: 'rocket' },
    ]);
  }

  private buildAttendanceStats(s: DashboardStats): void {
    this.attendanceStats.set([
      { label: 'Present', value: String(s.present_today ?? 0), bg: '#DCFCE7', color: '#15803D' },
      { label: 'Absent', value: String(s.absent_today ?? 0), bg: '#FEE2E2', color: '#B91C1C' },
      { label: 'On Leave', value: String(s.on_leave_today ?? 0), bg: '#DBEAFE', color: '#1D4ED8' },
    ]);
  }

  private resolveColor(name: string, fallbackIndex: number): string {
    if (this.deptColors[name]) return this.deptColors[name];
    const fallback = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16'];
    return fallback[fallbackIndex % fallback.length];
  }

  private buildDeptCards(rows: DepartmentBreakdown[]): void {
    const total = rows.reduce((sum, r) => sum + r.total_employees, 0) || 1;
    this.deptCards.set(
      rows.map((r, i) => ({
        name: r.department_name,
        count: r.total_employees,
        pct: Math.round((r.total_employees / total) * 1000) / 10,
        color: this.resolveColor(r.department_name, i),
      })),
    );
  }

  private buildPie(rows: DepartmentBreakdown[]): void {
    if (!rows.length) {
      this.pieChart.set({});
      return;
    }
    this.pieChart.set({
      tooltip: { trigger: 'item' },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['0%', '78%'],
          avoidLabelOverlap: false,
          label: { show: false },
          labelLine: { show: false },
          data: rows.map((r, i) => ({
            value: r.total_employees,
            name: r.department_name,
            itemStyle: { color: this.resolveColor(r.department_name, i) },
          })),
        },
      ],
    });
  }

  private buildHorizontal(rows: DepartmentBreakdown[]): void {
    if (!rows.length) {
      this.horizontalChart.set({});
      return;
    }
    const sorted = [...rows].sort((a, b) => b.total_employees - a.total_employees);
    this.horizontalChart.set({
      grid: { left: 90, right: 24, top: 8, bottom: 8 },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: { type: 'value', show: false, splitLine: { show: false } },
      yAxis: {
        type: 'category',
        data: sorted.map((r) => r.department_name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#475569', fontSize: 12 },
      },
      series: [
        {
          type: 'bar',
          data: sorted.map((r, i) => ({
            value: r.total_employees,
            itemStyle: { color: this.resolveColor(r.department_name, i), borderRadius: [0, 6, 6, 0] },
          })),
          barWidth: 14,
          label: { show: true, position: 'right', color: '#0F172A', fontWeight: 600, fontSize: 12 },
        },
      ],
    });
  }

  private buildWeeklyChart(rows: WeeklyAttendance[]): void {
    if (!rows.length) {
      this.weeklyChart.set({});
      return;
    }
    const labels = rows.map((r) => new Date(r.date).toLocaleDateString('en-US', { weekday: 'short' }));
    this.weeklyChart.set({
      grid: { left: 30, right: 8, top: 30, bottom: 22 },
      legend: {
        top: 0,
        right: 0,
        icon: 'roundRect',
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { fontSize: 10, color: '#64748B' },
      },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F1F5F9' } },
        axisLabel: { color: '#94A3B8', fontSize: 10 },
      },
      series: [
        {
          name: 'Present',
          type: 'bar',
          stack: 'a',
          barWidth: 14,
          itemStyle: { color: '#10B981', borderRadius: [0, 0, 4, 4] },
          data: rows.map((r) => r.present),
        },
        {
          name: 'Late',
          type: 'bar',
          stack: 'a',
          itemStyle: { color: '#F59E0B' },
          data: rows.map((r) => r.late),
        },
        {
          name: 'Absent',
          type: 'bar',
          stack: 'a',
          itemStyle: { color: '#EF4444', borderRadius: [4, 4, 0, 0] },
          data: rows.map((r) => r.absent),
        },
      ],
    });
  }

  getSummaryIcon(icon: SummaryStat['icon']): string {
    const icons: Record<string, string> = {
      users:
        '<svg viewBox="0 0 24 24"><path d="M16 19c0-2.2-1.8-4-4-4H7c-2.2 0-4 1.8-4 4"/><circle cx="9.5" cy="8" r="3.5"/><path d="M21 19c0-1.9-1.3-3.5-3.1-3.9"/><path d="M16 4.3a3.5 3.5 0 0 1 0 6.4"/></svg>',
      check:
        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="9.5" r="3.5"/><path d="M5.5 19a7 7 0 0 1 13 0"/></svg>',
      rocket:
        '<svg viewBox="0 0 24 24"><path d="M16 19c0-2.2-1.8-4-4-4H7c-2.2 0-4 1.8-4 4"/><circle cx="9.5" cy="8" r="3.5"/><path d="m17 5 4 4-3 3-4-4z"/></svg>',
    };
    return icons[icon] || icons['users'];
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  }
}
