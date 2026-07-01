import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, interval } from 'rxjs';
import { switchMap, startWith, shareReplay } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private apiUrl = `${environment.apiUrl}/dashboard`;

  stats$ = interval(60000).pipe(
    startWith(0),
    switchMap(() => this.getStats()),
    shareReplay(1)
  );

  constructor(private http: HttpClient) {}

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getWeeklyAttendance(): Observable<any> {
    return this.http.get(`${this.apiUrl}/weekly-attendance`);
  }

  getDepartmentBreakdown(): Observable<any> {
    return this.http.get(`${this.apiUrl}/department-breakdown`);
  }

  getRecentLogins(): Observable<any> {
    return this.http.get(`${this.apiUrl}/recent-logins`);
  }
}
