import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { HolidayService, HolidayShift, HolidayType } from '../../core/services/holiday.service';

@Component({
  selector: 'app-add-holiday',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-holiday.component.html',
  styleUrls: ['./holiday-form.scss'],
})
export class AddHolidayComponent {
  readonly form: FormGroup;
  submitted = false;
  saving = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private holidayService: HolidayService,
  ) {
    this.form = this.fb.group({
      holidayNo: ['', [Validators.required]],
      name: ['', [Validators.required]],
      date: ['', [Validators.required]],
      location: ['', [Validators.required]],
      shift: ['All Shifts', [Validators.required]],
      details: ['', [Validators.required]],
    });
  }

  submit(): void {
    this.submitted = true;
    this.errorMessage = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.value;
    const shiftMap: Record<string, HolidayShift> = {
      'All Shifts': 'all_shifts',
      'Day Shift': 'day_shift',
      'Night Shifts': 'night_shifts',
    };

    this.saving = true;
    this.holidayService
      .create({
        holiday_no: v.holidayNo,
        name: v.name,
        shift: shiftMap[v.shift] ?? 'all_shifts',
        holiday_date: v.date,
        location: v.location,
        holiday_type: 'cultural' as HolidayType,
        details: v.details,
        status: 'pending',
      })
      .subscribe({
        next: () => this.router.navigate(['/holidays']),
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.detail || 'Failed to save holiday.';
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
