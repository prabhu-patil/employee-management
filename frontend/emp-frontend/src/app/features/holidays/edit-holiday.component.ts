import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import {
  Holiday as ApiHoliday,
  HolidayService,
  HolidayShift,
} from '../../core/services/holiday.service';

const SHIFT_TO_LABEL: Record<HolidayShift, string> = {
  all_shifts: 'All Shifts',
  day_shift: 'Day Shift',
  night_shifts: 'Night Shifts',
};

const LABEL_TO_SHIFT: Record<string, HolidayShift> = {
  'All Shifts': 'all_shifts',
  'Day Shift': 'day_shift',
  'Night Shifts': 'night_shifts',
};

@Component({
  selector: 'app-edit-holiday',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-holiday.component.html',
  styleUrls: ['./holiday-form.scss'],
})
export class EditHolidayComponent implements OnInit {
  readonly form: FormGroup;
  submitted = false;
  loading = false;
  errorMessage = '';

  private holidayId = '';
  private originalType: ApiHoliday['holiday_type'] = 'national';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private holidayService: HolidayService,
  ) {
    this.form = this.fb.group({
      holidayNo: ['', [Validators.required]],
      name: ['', [Validators.required]],
      date: ['', [Validators.required]],
      location: ['', [Validators.required]],
      shift: ['', [Validators.required]],
      details: ['', [Validators.required]],
    });
  }

  ngOnInit(): void {
    this.holidayId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.holidayId) {
      this.router.navigate(['/holidays']);
      return;
    }

    const fromState = (history.state && (history.state as any).holiday) as ApiHoliday | undefined;
    if (fromState && fromState.id === this.holidayId) {
      this.populate(fromState);
      return;
    }

    this.loading = true;
    this.holidayService.list().subscribe({
      next: (rows) => {
        const found = rows.find((r) => r.id === this.holidayId);
        if (found) {
          this.populate(found);
        } else {
          this.errorMessage = 'Holiday not found';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMessage = 'Failed to load holiday';
        this.loading = false;
      },
    });
  }

  private populate(h: ApiHoliday): void {
    this.originalType = h.holiday_type;
    this.form.patchValue({
      holidayNo: h.holiday_no || '',
      name: h.name || '',
      date: (h.holiday_date || '').slice(0, 10),
      location: h.location || '',
      shift: SHIFT_TO_LABEL[h.shift] || 'All Shifts',
      details: h.details || '',
    });
  }

  submit(): void {
    this.submitted = true;
    if (this.form.invalid || !this.holidayId) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const payload = {
      holiday_no: v.holidayNo,
      name: v.name,
      holiday_date: v.date,
      location: v.location || null,
      shift: LABEL_TO_SHIFT[v.shift] || ('all_shifts' as HolidayShift),
      details: v.details || null,
      holiday_type: this.originalType,
    };

    this.loading = true;
    this.holidayService.update(this.holidayId, payload).subscribe({
      next: () => {
        this.loading = false;
        this.router.navigate(['/holidays']);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.detail || 'Failed to update holiday';
      },
    });
  }

  cancel(): void {
    this.router.navigate(['/holidays']);
  }

  hasError(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.touched || this.submitted);
  }
}
