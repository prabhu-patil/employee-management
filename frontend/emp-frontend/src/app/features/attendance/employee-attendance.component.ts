import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AttendanceService } from '../../core/services/attendance.service';
import { EmployeeService } from '../../core/services/employee.service';
import { resolveAvatarUrl } from '../../core/utils/avatar.util';

type AttendanceRow = {
  date: string;
  checkIn: string;
  checkOut: string;
  workingHours: string;
  shift: string;
  status: 'Present' | 'Late' | 'Half Day' | 'Leave' | 'WFH' | 'Absent';
};

type StatTile = {
  label: string;
  value: string;
  bg: string;
  color: string;
  icon: 'clock' | 'login' | 'logout' | 'coffee';
};

type Tab = 'today' | 'summary' | 'log' | 'analytics';

type SummaryStats = {
  present: number;
  late: number;
  half: number;
  wfh: number;
  leave: number;
  absent: number;
  totalHours: string;
  avgHours: string;
};

type StatusRing = {
  label: string;
  value: number;
  color: string;
};

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './employee-attendance.component.html',
  styleUrls: ['./employee-attendance.component.scss'],
})
export class EmployeeAttendanceComponent implements OnInit {
  loading = signal<boolean>(true);
  errorMessage = signal<string>('');
  usingSampleData = signal<boolean>(false);

  profile = {
    name: 'Loading…',
    title: '',
    employeeId: '',
    department: '',
    joined: '',
    avatarUrl: '' as string | undefined,
  };

  tiles: StatTile[] = [
    { label: 'Avg Working Hours', value: '--:--', bg: '#EDE9FE', color: '#7C3AED', icon: 'clock' },
    { label: 'Shift In Time', value: '--:-- AM', bg: '#DCFCE7', color: '#16A34A', icon: 'login' },
    { label: 'Avg Out Time', value: '--:-- PM', bg: '#FFEDD5', color: '#EA580C', icon: 'logout' },
    { label: 'Avg Break Time', value: '01:00', bg: '#F3E8FF', color: '#9333EA', icon: 'coffee' },
  ];

  readonly tab = signal<Tab>('today');
  todayRow: AttendanceRow | null = null;
  summaryStats: SummaryStats = {
    present: 0, late: 0, half: 0, wfh: 0, leave: 0, absent: 0,
    totalHours: '00:00', avgHours: '00:00',
  };
  rows: AttendanceRow[] = [];

  distributionChart: EChartsOption = {};

  statusRings: StatusRing[] = [
    { label: 'Punctuality', value: 0, color: '#A855F7' },
    { label: 'Productivity', value: 0, color: '#22C55E' },
    { label: 'Engagement', value: 0, color: '#0EA5E9' },
    { label: 'Quality', value: 0, color: '#F97316' },
    { label: 'Attendance', value: 0, color: '#10B981' },
    { label: 'Reliability', value: 0, color: '#EC4899' },
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private employeeService: EmployeeService,
    private attendanceService: AttendanceService,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/attendance/employee']);
      return;
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    forkJoin({
      employee: this.employeeService.getById(id).pipe(catchError(() => of(null))),
      records: this.attendanceService.getUserAttendance(id, year, month).pipe(catchError(() => of([] as any[]))),
    }).subscribe({
      next: ({ employee, records }) => {
        if (!employee) {
          this.errorMessage.set('Employee not found');
          this.loading.set(false);
          return;
        }
        this.profile = {
          name: employee.full_name || 'Employee',
          title: this.titleCase(employee.role),
          employeeId: employee.employee_id || '—',
          department: employee.department_name || 'Unassigned',
          joined: this.formatJoined(employee.created_at),
          avatarUrl: employee.avatar_url ? resolveAvatarUrl(employee.avatar_url) : undefined,
        };
        const recs = (records || []).slice().sort((a: any, b: any) =>
          (b.date > a.date ? 1 : b.date < a.date ? -1 : 0)
        );
        if (recs.length === 0) {
          this.applySampleData();
        } else {
          this.rows = recs.map((r: any) => this.toRow(r));
          this.updateAggregates(recs);
        }
        this.recomputeTodayAndSummary();
        this.loading.set(false);
      },
      error: () => {
        this.errorMessage.set('Failed to load employee attendance');
        this.loading.set(false);
      },
    });
  }

  private applySampleData(): void {
    this.usingSampleData.set(true);

    this.tiles = [
      { label: 'Avg Working Hours', value: '08:00', bg: '#EDE9FE', color: '#7C3AED', icon: 'clock' },
      { label: 'Shift In Time', value: '10:30 AM', bg: '#DCFCE7', color: '#16A34A', icon: 'login' },
      { label: 'Avg Out Time', value: '07:30 PM', bg: '#FFEDD5', color: '#EA580C', icon: 'logout' },
      { label: 'Avg Break Time', value: '01:00', bg: '#F3E8FF', color: '#9333EA', icon: 'coffee' },
    ];

    this.rows = this.buildSampleMonthRows();

    this.distributionChart = {
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
          data: [
            { value: 62, name: 'Present', itemStyle: { color: '#22C55E' } },
            { value: 8, name: 'Late', itemStyle: { color: '#F59E0B' } },
            { value: 6, name: 'Half Day', itemStyle: { color: '#3B82F6' } },
            { value: 4, name: 'Leave', itemStyle: { color: '#A855F7' } },
            { value: 3, name: 'Absent', itemStyle: { color: '#EF4444' } },
            { value: 2, name: 'WFH', itemStyle: { color: '#06B6D4' } },
          ],
        },
      ],
    };

    this.statusRings = [
      { label: 'Punctuality', value: 75, color: '#A855F7' },
      { label: 'Productivity', value: 84, color: '#22C55E' },
      { label: 'Engagement', value: 67, color: '#0EA5E9' },
      { label: 'Quality', value: 88, color: '#F97316' },
      { label: 'Attendance', value: 92, color: '#10B981' },
      { label: 'Reliability', value: 81, color: '#EC4899' },
    ];
  }

  private buildSampleMonthRows(): AttendanceRow[] {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const upTo = Math.min(today.getDate(), lastDay);

    const rows: AttendanceRow[] = [];
    for (let day = upTo; day >= 1; day--) {
      const d = new Date(year, month, day);
      const dow = d.getDay();
      const dd = String(day).padStart(2, '0');
      const mm = String(month + 1).padStart(2, '0');
      const dateStr = `${dd}-${mm}-${year}`;

      if (dow === 0 || dow === 6) {
        rows.push({
          date: dateStr,
          checkIn: '–',
          checkOut: '–',
          workingHours: '00:00',
          shift: 'WEEKEND',
          status: 'Leave',
        });
        continue;
      }

      const pattern = day % 9;
      let row: AttendanceRow;
      switch (pattern) {
        case 0:
          row = { date: dateStr, checkIn: '11:00', checkOut: '04:30', workingHours: '05:30', shift: 'SHIFT 1', status: 'Late' };
          break;
        case 1:
          row = { date: dateStr, checkIn: '10:30', checkOut: '03:30', workingHours: '05:00', shift: 'SHIFT 1', status: 'Half Day' };
          break;
        case 2:
          row = { date: dateStr, checkIn: '–', checkOut: '–', workingHours: '00:00', shift: 'SHIFT 1', status: 'Leave' };
          break;
        case 3:
          row = { date: dateStr, checkIn: '10:00', checkOut: '07:00', workingHours: '08:00', shift: 'WFH', status: 'WFH' };
          break;
        case 4:
          row = { date: dateStr, checkIn: '–', checkOut: '–', workingHours: '00:00', shift: 'SHIFT 1', status: 'Absent' };
          break;
        default:
          row = { date: dateStr, checkIn: '10:00', checkOut: '07:00', workingHours: '09:00', shift: 'SHIFT 1', status: 'Present' };
      }
      rows.push(row);
    }
    return rows;
  }

  private recomputeTodayAndSummary(): void {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    const todayKey = `${dd}-${mm}-${yyyy}`;
    this.todayRow = this.rows.find((r) => r.date === todayKey) || null;

    const stats: SummaryStats = { present: 0, late: 0, half: 0, wfh: 0, leave: 0, absent: 0, totalHours: '00:00', avgHours: '00:00' };
    let totalMins = 0;
    for (const r of this.rows) {
      switch (r.status) {
        case 'Present': stats.present++; break;
        case 'Late': stats.late++; break;
        case 'Half Day': stats.half++; break;
        case 'WFH': stats.wfh++; break;
        case 'Leave': stats.leave++; break;
        case 'Absent': stats.absent++; break;
      }
      const parts = r.workingHours?.split(':') || ['0', '0'];
      const hh = parseInt(parts[0], 10) || 0;
      const mm2 = parseInt(parts[1], 10) || 0;
      totalMins += hh * 60 + mm2;
    }
    stats.totalHours = this.minutesToHHMM(totalMins);
    stats.avgHours = this.rows.length ? this.minutesToHHMM(Math.round(totalMins / this.rows.length)) : '00:00';
    this.summaryStats = stats;
  }

  private minutesToHHMM(total: number): string {
    const hh = Math.floor(total / 60);
    const mm = total % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  private toRow(r: any): AttendanceRow {
    return {
      date: this.formatShortDate(r.date),
      checkIn: this.formatClock(r.check_in),
      checkOut: this.formatClock(r.check_out),
      workingHours: this.formatHours(r.total_hours),
      shift: (r.work_mode || 'SHIFT 1').toString().toUpperCase(),
      status: this.mapStatusLabel(r.status),
    };
  }

  private mapStatusLabel(status: string): AttendanceRow['status'] {
    switch ((status || '').toLowerCase()) {
      case 'present': return 'Present';
      case 'late': return 'Late';
      case 'half_day': return 'Half Day';
      case 'on_leave': return 'Leave';
      case 'wfh': return 'WFH';
      default: return 'Absent';
    }
  }

  private formatJoined(value?: string): string {
    if (!value) return '—';
    try {
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return '—';
      return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'long', year: 'numeric' });
    } catch { return '—'; }
  }

  private formatShortDate(value: string): string {
    if (!value) return '-';
    try {
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return value;
      const dd = String(dt.getDate()).padStart(2, '0');
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const yyyy = dt.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    } catch { return value; }
  }

  private formatClock(value?: string | null): string {
    if (!value) return '–';
    try {
      const dt = new Date(value);
      if (Number.isNaN(dt.getTime())) return '–';
      return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch { return '–'; }
  }

  private formatHours(h?: number | null): string {
    if (h === null || h === undefined) return '00:00';
    const total = Math.max(0, Math.round(h * 60));
    const hh = String(Math.floor(total / 60)).padStart(2, '0');
    const mm = String(total % 60).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  private updateAggregates(records: any[]): void {
    if (!records.length) {
      this.distributionChart = this.buildDistribution({ Present: 0, Late: 0, 'Half Day': 0, Leave: 0, Absent: 0, WFH: 0 });
      this.statusRings = this.statusRings.map((r) => ({ ...r, value: 0 }));
      return;
    }

    const counts = { Present: 0, Late: 0, 'Half Day': 0, Leave: 0, Absent: 0, WFH: 0 } as Record<string, number>;
    let hoursSum = 0;
    let inMinutesSum = 0;
    let outMinutesSum = 0;
    let inCount = 0;
    let outCount = 0;

    for (const r of records) {
      const label = this.mapStatusLabel(r.status);
      counts[label] = (counts[label] || 0) + 1;
      if (typeof r.total_hours === 'number') hoursSum += r.total_hours;
      if (r.check_in) {
        const dt = new Date(r.check_in);
        if (!Number.isNaN(dt.getTime())) {
          inMinutesSum += dt.getHours() * 60 + dt.getMinutes();
          inCount++;
        }
      }
      if (r.check_out) {
        const dt = new Date(r.check_out);
        if (!Number.isNaN(dt.getTime())) {
          outMinutesSum += dt.getHours() * 60 + dt.getMinutes();
          outCount++;
        }
      }
    }

    const avgHours = hoursSum / records.length;
    this.tiles[0].value = this.formatHours(avgHours);
    this.tiles[1].value = inCount ? this.minutesToClock(Math.round(inMinutesSum / inCount)) : '--:--';
    this.tiles[2].value = outCount ? this.minutesToClock(Math.round(outMinutesSum / outCount)) : '--:--';

    this.distributionChart = this.buildDistribution(counts);

    const total = records.length;
    const presentLike = (counts['Present'] || 0) + (counts['WFH'] || 0);
    const onTime = (counts['Present'] || 0) + (counts['WFH'] || 0);
    const attendancePct = Math.round((presentLike / total) * 100);
    const punctuality = Math.round((onTime / total) * 100);
    this.statusRings = [
      { label: 'Punctuality', value: punctuality, color: '#A855F7' },
      { label: 'Productivity', value: attendancePct, color: '#22C55E' },
      { label: 'Engagement', value: attendancePct, color: '#0EA5E9' },
      { label: 'Quality', value: attendancePct, color: '#F97316' },
      { label: 'Attendance', value: attendancePct, color: '#10B981' },
      { label: 'Reliability', value: punctuality, color: '#EC4899' },
    ];
  }

  private minutesToClock(total: number): string {
    let hh = Math.floor(total / 60);
    const mm = total % 60;
    const ampm = hh >= 12 ? 'PM' : 'AM';
    hh = hh % 12 || 12;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} ${ampm}`;
  }

  private buildDistribution(counts: Record<string, number>): EChartsOption {
    const palette: Record<string, string> = {
      Present: '#22C55E',
      Late: '#F59E0B',
      'Half Day': '#3B82F6',
      Leave: '#A855F7',
      Absent: '#EF4444',
      WFH: '#06B6D4',
    };
    const data = Object.keys(counts)
      .filter((k) => counts[k] > 0)
      .map((k) => ({ value: counts[k], name: k, itemStyle: { color: palette[k] } }));

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

  ringOption(value: number, color: string): EChartsOption {
    return {
      series: [
        {
          type: 'pie',
          radius: ['72%', '92%'],
          avoidLabelOverlap: false,
          silent: true,
          label: {
            show: true,
            position: 'center',
            formatter: '{c}%',
            color: '#0F172A',
            fontSize: 14,
            fontWeight: 700,
          },
          labelLine: { show: false },
          data: [
            { value, itemStyle: { color }, label: { show: true } },
            { value: Math.max(0, 100 - value), itemStyle: { color: '#E2E8F0' }, label: { show: false } },
          ],
        },
      ],
    };
  }

  setTab(t: Tab): void {
    this.tab.set(t);
  }

  goBack(): void {
    this.router.navigate(['/attendance/employee']);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  }

  private titleCase(s: string | undefined | null): string {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  getTileIcon(icon: StatTile['icon']): string {
    const icons: Record<string, string> = {
      clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      login: '<svg viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>',
      logout: '<svg viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
      coffee: '<svg viewBox="0 0 24 24"><path d="M3 8h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M17 10h2a3 3 0 0 1 0 6h-2"/><path d="M7 4v2M11 4v2M15 4v2"/></svg>',
    };
    return icons[icon] || icons['clock'];
  }
}
