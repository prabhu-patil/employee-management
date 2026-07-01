import { CommonModule, formatDate } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';

type AttendanceValue = 0 | 1 | 2 | 3;

export type HeatmapAttendanceRecord = {
  date: string | Date;
  status?: 'absent' | 'half_day' | 'present' | 'wfh' | string;
  value?: AttendanceValue | number;
};

@Component({
  selector: 'app-heatmap',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  template: `
    <section class="heatmap-panel">
      <header class="heatmap-header">
        <button type="button" aria-label="Previous year" (click)="changeYear(-1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <h2>{{ year }}</h2>
        <button type="button" aria-label="Next year" (click)="changeYear(1)">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
        </button>
      </header>

      <div
        echarts
        class="heatmap-chart"
        [options]="chartOptions"
        [autoResize]="true"
        (chartClick)="onChartClick($event)">
      </div>

      <footer class="legend" aria-label="Attendance legend">
        <span>Absent</span>
        <i style="background:#334155"></i>
        <i style="background:#93C5FD"></i>
        <i style="background:#2563EB"></i>
        <i style="background:#38BDF8"></i>
        <span>WFH</span>
      </footer>
    </section>
  `,
  styles: [`
    :host {
      display: block;
    }

    .heatmap-panel {
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
      padding: 16px;
    }

    :host-context(.dark) .heatmap-panel {
      border-color: #334155;
      background: transparent;
    }

    .heatmap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .heatmap-header h2 {
      margin: 0;
      color: #111827;
      font-size: 16px;
      font-weight: 700;
    }

    :host-context(.dark) .heatmap-header h2 {
      color: #E5E7EB;
    }

    .heatmap-header button {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border: 1px solid #E5E7EB;
      border-radius: 9px;
      background: #FFFFFF;
      color: #64748B;
      cursor: pointer;
    }

    .heatmap-header button:hover {
      border-color: #BFDBFE;
      background: #EFF6FF;
      color: #2563EB;
    }

    :host-context(.dark) .heatmap-header button {
      border-color: #334155;
      background: #0F172A;
      color: #94A3B8;
    }

    .heatmap-header svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .heatmap-chart {
      width: 100%;
      height: 210px;
    }

    .legend {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      color: #94A3B8;
      font-size: 11px;
      font-weight: 600;
    }

    .legend i {
      width: 12px;
      height: 12px;
      border-radius: 3px;
    }
  `],
})
export class HeatmapComponent implements OnChanges {
  @Input() records: HeatmapAttendanceRecord[] = [];
  @Input() year = new Date().getFullYear();
  @Output() dateSelected = new EventEmitter<string>();
  @Output() yearChange = new EventEmitter<number>();

  chartOptions: EChartsCoreOption = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['records'] || changes['year']) {
      this.buildChartOptions();
    }
  }

  changeYear(delta: number): void {
    this.year += delta;
    this.yearChange.emit(this.year);
    this.buildChartOptions();
  }

  onChartClick(event: ECElementEvent): void {
    const value = event.value;
    const date = Array.isArray(value) ? value[0] : undefined;

    if (typeof date === 'string') {
      this.dateSelected.emit(date);
    }
  }

  private buildChartOptions(): void {
    this.chartOptions = {
      backgroundColor: 'transparent',
      textStyle: {
        color: '#94A3B8',
        fontFamily: 'Inter, sans-serif',
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#FFFFFF',
        borderColor: '#E5E7EB',
        borderWidth: 1,
        textStyle: { color: '#111827' },
        formatter: (params: any) => {
          const [date, value] = params.value as [string, number];
          return `${date}<br/>${this.valueLabel(value)}`;
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: 3,
        inRange: {
          color: ['#334155', '#93C5FD', '#2563EB', '#38BDF8'],
        },
      },
      calendar: {
        top: 34,
        left: 28,
        right: 18,
        bottom: 16,
        range: `${this.year}`,
        cellSize: ['auto', 16],
        splitLine: {
          show: false,
        },
        itemStyle: {
          color: '#F1F5F9',
          borderWidth: 3,
          borderColor: '#FFFFFF',
          borderRadius: 4,
        },
        yearLabel: {
          show: false,
        },
        monthLabel: {
          show: true,
          position: 'start',
          margin: 10,
          color: '#94A3B8',
          fontSize: 11,
          fontWeight: 600,
          nameMap: 'en',
        },
        dayLabel: {
          show: true,
          firstDay: 1,
          margin: 8,
          color: '#94A3B8',
          fontSize: 10,
          nameMap: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
        },
      },
      series: [{
        type: 'heatmap',
        coordinateSystem: 'calendar',
        data: this.buildYearData(),
        emphasis: {
          itemStyle: {
            borderColor: '#111827',
            borderWidth: 1,
          },
        },
      }],
    };
  }

  private buildYearData(): Array<[string, AttendanceValue]> {
    const byDate = new Map<string, AttendanceValue>();

    for (const record of this.records) {
      const date = this.toDateKey(record.date);
      if (date.startsWith(`${this.year}-`)) {
        byDate.set(date, this.toValue(record));
      }
    }

    const data: Array<[string, AttendanceValue]> = [];
    const cursor = new Date(this.year, 0, 1);
    const end = new Date(this.year, 11, 31);

    while (cursor <= end) {
      const date = this.toDateKey(cursor);
      data.push([date, byDate.get(date) ?? 0]);
      cursor.setDate(cursor.getDate() + 1);
    }

    return data;
  }

  private toDateKey(date: string | Date): string {
    const parsed = date instanceof Date ? date : new Date(date);
    return formatDate(parsed, 'yyyy-MM-dd', 'en-US');
  }

  private toValue(record: HeatmapAttendanceRecord): AttendanceValue {
    if (typeof record.value === 'number') {
      return Math.max(0, Math.min(3, Math.round(record.value))) as AttendanceValue;
    }

    switch (record.status) {
      case 'half_day':
        return 1;
      case 'present':
        return 2;
      case 'wfh':
        return 3;
      case 'absent':
      default:
        return 0;
    }
  }

  private valueLabel(value: number): string {
    return ['Absent', 'Half day', 'Present', 'WFH'][value] ?? 'Absent';
  }
}
