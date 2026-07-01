import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { shareReplay, startWith, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface DashboardStats {
  total_employees: number;
  present_today: number;
  absent_today: number;
  late_today: number;
  on_leave_today: number;
  wfh_today: number;
  pending_leaves: number;
  new_employees_this_month: number;
  attendance_percentage_today: number;
}

export interface WeeklyAttendance {
  date: string;
  present: number;
  absent: number;
  late: number;
  wfh: number;
}

export interface DepartmentBreakdown {
  department_name: string;
  total_employees: number;
  present_today: number;
}

export interface RecentLogin {
  user_id: string;
  full_name: string;
  employee_id: string | null;
  login_at: string;
  city: string | null;
  country: string | null;
  device_info: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  stats$ = interval(60000).pipe(
    startWith(0),
    switchMap(() => this.getStats()),
    shareReplay(1),
  );

  constructor(private http: HttpClient) {}

  getStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/stats`);
  }

  getWeeklyAttendance(): Observable<WeeklyAttendance[]> {
    return this.http.get<WeeklyAttendance[]>(`${this.apiUrl}/weekly-attendance`);
  }

  getDepartmentBreakdown(): Observable<DepartmentBreakdown[]> {
    return this.http.get<DepartmentBreakdown[]>(`${this.apiUrl}/department-breakdown`);
  }

  getRecentLogins(): Observable<RecentLogin[]> {
    return this.http.get<RecentLogin[]>(`${this.apiUrl}/recent-logins`);
  }
}
