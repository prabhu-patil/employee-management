import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { EChartsOption } from 'echarts';

type Kpi = {
  label: string;
  value: string;
  change: string;
  gradient: string;
  icon: 'ticket' | 'check' | 'briefcase' | 'calendar';
};

type TeamMember = {
  initials: string;
  name: string;
  role: string;
  status: 'Online' | 'Busy' | 'Away';
  bg: string;
  color: string;
};

type Task = {
  title: string;
  project: string;
  priority: 'High' | 'Medium' | 'Low';
  due: string;
};

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  templateUrl: './employee-dashboard.component.html',
  styleUrls: ['./employee-dashboard.component.scss'],
})
export class EmployeeDashboardComponent {
  readonly kpis: Kpi[] = [
    { label: 'New Tickets', value: '23', change: '27% Higher Then Last Month', gradient: 'linear-gradient(135deg, #FB7185, #E11D48)', icon: 'ticket' },
    { label: 'Ticket Resolved', value: '20', change: '27% Higher Then Last Month', gradient: 'linear-gradient(135deg, #34D399, #059669)', icon: 'check' },
    { label: 'Project Assigned', value: '13', change: '27% Higher Then Last Month', gradient: 'linear-gradient(135deg, #FB923C, #EA580C)', icon: 'briefcase' },
    { label: 'Available Leaves', value: '34', change: '27% Higher Then Last Month', gradient: 'linear-gradient(135deg, #60A5FA, #2563EB)', icon: 'calendar' },
  ];

  readonly weeklyChart = signal<EChartsOption>({
    grid: { left: 30, right: 16, top: 30, bottom: 50 },
    legend: {
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: '#475569', fontSize: 11 },
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: {
      type: 'category',
      data: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#64748B', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      max: 100,
      splitLine: { lineStyle: { color: '#F1F5F9' } },
      axisLabel: { color: '#94A3B8', fontSize: 10, formatter: '{value}%' },
    },
    series: [
      {
        name: 'Work Hours',
        type: 'bar',
        stack: 'total',
        barWidth: 32,
        itemStyle: { color: '#7C3AED', borderRadius: [0, 0, 6, 6] },
        data: [62, 67, 87, 88, 56, 89],
        label: {
          show: true,
          position: 'inside',
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 700,
          formatter: '{c}%',
        },
      },
      {
        name: 'Break Hours',
        type: 'bar',
        stack: 'total',
        itemStyle: { color: '#CBD5E1', borderRadius: [6, 6, 0, 0] },
        data: [38, 33, 13, 12, 44, 11],
        label: {
          show: true,
          position: 'inside',
          color: '#475569',
          fontSize: 11,
          fontWeight: 700,
          formatter: '{c}%',
        },
      },
    ],
  });

  readonly projectChart = signal<EChartsOption>({
    tooltip: { trigger: 'item', formatter: '{b}: {c}%' },
    legend: { show: false },
    series: [
      {
        type: 'pie',
        radius: ['65%', '88%'],
        avoidLabelOverlap: false,
        label: { show: false },
        labelLine: { show: false },
        data: [
          { value: 52, name: 'Project 1', itemStyle: { color: '#6366F1' } },
          { value: 28, name: 'Project 2', itemStyle: { color: '#F59E0B' } },
          { value: 20, name: 'Project 3', itemStyle: { color: '#EF4444' } },
        ],
      },
    ],
  });

  readonly team: TeamMember[] = [
    { initials: 'JD', name: 'John Doe', role: 'UI Designer', status: 'Online', bg: '#DBEAFE', color: '#1D4ED8' },
    { initials: 'SP', name: 'Sarah Parker', role: 'Backend Engineer', status: 'Busy', bg: '#FEE2E2', color: '#B91C1C' },
    { initials: 'MK', name: 'Mike Kennedy', role: 'Frontend Engineer', status: 'Online', bg: '#DCFCE7', color: '#15803D' },
    { initials: 'EW', name: 'Emily White', role: 'Product Manager', status: 'Away', bg: '#FEF3C7', color: '#B45309' },
    { initials: 'RB', name: 'Ryan Brown', role: 'QA Engineer', status: 'Online', bg: '#F3E8FF', color: '#6B21A8' },
  ];

  readonly tasks: Task[] = [
    { title: 'Design new dashboard mockups', project: 'Project Aurora', priority: 'High', due: 'Today' },
    { title: 'Review pull request #142', project: 'Internal Tools', priority: 'Medium', due: 'Tomorrow' },
    { title: 'Sync with marketing team', project: 'Launch Campaign', priority: 'Low', due: 'Wed' },
    { title: 'Fix login redirect bug', project: 'Customer Portal', priority: 'High', due: 'Today' },
    { title: 'Update API documentation', project: 'Developer Hub', priority: 'Medium', due: 'Friday' },
  ];

  getKpiIcon(icon: Kpi['icon']): string {
    const icons: Record<string, string> = {
      ticket:
        '<svg viewBox="0 0 24 24"><path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4Z"/><path d="M11 6v12" stroke-dasharray="2 2"/></svg>',
      check: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
      briefcase: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
      calendar: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    };
    return icons[icon] || icons['ticket'];
  }
}
