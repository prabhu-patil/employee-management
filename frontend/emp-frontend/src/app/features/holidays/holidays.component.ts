import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  Holiday as ApiHoliday,
  HolidayService,
  HolidayShift,
  HolidayStatus as ApiStatus,
  HolidayType as ApiType,
} from '../../core/services/holiday.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

type HolidayStatus = 'Approved' | 'Pending';
type HolidayType = 'National' | 'Awareness' | 'Religious' | 'Cultural' | 'Environmental';

interface Holiday {
  id: string;
  name: string;
  shift: 'Night Shifts' | 'All Shifts' | 'Day Shift';
  date: string;
  type: HolidayType;
  createdBy: string;
  creationDate: string;
  status: HolidayStatus;
  details: string;
}

@Component({
  selector: 'app-holidays',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmDialogComponent],
  templateUrl: './holidays.component.html',
  styleUrls: ['./holidays.component.scss'],
})
export class HolidaysComponent implements OnInit {
  constructor(private router: Router, private holidayService: HolidayService) {}

  readonly typeFilter = signal<'all' | HolidayType>('all');
  readonly search = signal<string>('');
  readonly pageSize = signal<number>(10);
  readonly page = signal<number>(1);
  readonly selected = signal<Set<string>>(new Set());
  readonly viewMode = signal<'table' | 'grid'>('grid');
  readonly pendingDelete = signal<Holiday | null>(null);

  readonly typeOptions: ('all' | HolidayType)[] = [
    'all',
    'National',
    'Religious',
    'Cultural',
    'Awareness',
    'Environmental',
  ];

  readonly holidays = signal<Holiday[]>([]);
  private apiRows: ApiHoliday[] = [];

  ngOnInit(): void {
    this.fetchHolidays();
  }

  private fetchHolidays(): void {
    this.holidayService.list().subscribe({
      next: (rows) => {
        this.apiRows = rows;
        this.holidays.set(rows.map((r) => this.mapFromApi(r)));
      },
      error: () => {
        this.apiRows = [];
        this.holidays.set([]);
      },
    });
  }

  private mapFromApi(r: ApiHoliday): Holiday {
    const shiftMap: Record<HolidayShift, Holiday['shift']> = {
      all_shifts: 'All Shifts',
      day_shift: 'Day Shift',
      night_shifts: 'Night Shifts',
    };
    const typeMap: Record<ApiType, HolidayType> = {
      national: 'National',
      religious: 'Religious',
      cultural: 'Cultural',
      awareness: 'Awareness',
      environmental: 'Environmental',
    };
    const statusMap: Record<ApiStatus, HolidayStatus> = {
      approved: 'Approved',
      pending: 'Pending',
    };
    return {
      id: r.id,
      name: r.name,
      shift: shiftMap[r.shift],
      date: this.formatDate(r.holiday_date),
      type: typeMap[r.holiday_type],
      createdBy: 'Admin',
      creationDate: this.formatDate(r.created_at),
      status: statusMap[r.status],
      details: r.details ?? '',
    };
  }

  private formatDate(value: string): string {
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()}`;
  }

  readonly filtered = computed(() => {
    const term = this.search().toLowerCase().trim();
    const type = this.typeFilter();
    return this.holidays().filter((h) => {
      if (type !== 'all' && h.type !== type) return false;
      if (term && !h.name.toLowerCase().includes(term) && !h.type.toLowerCase().includes(term)) return false;
      return true;
    });
  });

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));

  readonly pagedRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });

  readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (!total) return '0 - 0 of 0';
    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(start + this.pageSize() - 1, total);
    return `${start} - ${end} of ${total}`;
  });

  readonly allOnPageSelected = computed(() => {
    const ids = this.pagedRows().map((r) => r.id);
    return ids.length > 0 && ids.every((id) => this.selected().has(id));
  });

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setTypeFilter(value: 'all' | HolidayType): void {
    this.typeFilter.set(value);
    this.page.set(1);
  }

  setPageSize(value: number): void {
    this.pageSize.set(value);
    this.page.set(1);
  }

  prevPage(): void {
    if (this.page() > 1) this.page.set(this.page() - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.page.set(this.page() + 1);
  }

  toggleAllOnPage(): void {
    const next = new Set(this.selected());
    const ids = this.pagedRows().map((r) => r.id);
    const allSelected = ids.every((id) => next.has(id));
    if (allSelected) {
      ids.forEach((id) => next.delete(id));
    } else {
      ids.forEach((id) => next.add(id));
    }
    this.selected.set(next);
  }

  toggleRow(id: string): void {
    const next = new Set(this.selected());
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.selected.set(next);
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  resetFilters(): void {
    this.typeFilter.set('all');
    this.search.set('');
    this.page.set(1);
  }

  toggleViewMode(): void {
    this.viewMode.set(this.viewMode() === 'table' ? 'grid' : 'table');
  }

  monthLabel(date: string): string {
    const parts = (date || '').split('/');
    const m = parseInt(parts[1], 10);
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return names[(m - 1 + 12) % 12] || '';
  }

  addHoliday(): void {
    this.router.navigate(['/holidays/add-holiday']);
  }

  editHoliday(row: Holiday): void {
    const api = this.apiRows.find((r) => r.id === row.id);
    this.router.navigate(['/holidays/edit-holiday', row.id], {
      state: api ? { holiday: api } : undefined,
    });
  }

  requestDelete(row: Holiday): void {
    this.pendingDelete.set(row);
  }

  cancelDelete(): void {
    this.pendingDelete.set(null);
  }

  confirmDelete(): void {
    const row = this.pendingDelete();
    if (!row) return;
    this.holidayService.delete(row.id).subscribe({
      next: () => {
        this.holidays.set(this.holidays().filter((h) => h.id !== row.id));
        const next = new Set(this.selected());
        next.delete(row.id);
        this.selected.set(next);
        this.pendingDelete.set(null);
      },
      error: () => {
        this.pendingDelete.set(null);
      },
    });
  }

  toggleStatus(id: string): void {
    const row = this.holidays().find((h) => h.id === id);
    if (!row) return;
    const next: ApiStatus = row.status === 'Approved' ? 'pending' : 'approved';
    this.holidayService.update(id, { status: next }).subscribe({
      next: (updated) => {
        const mapped = this.mapFromApi(updated);
        this.holidays.set(this.holidays().map((h) => (h.id === id ? mapped : h)));
      },
    });
  }
}
