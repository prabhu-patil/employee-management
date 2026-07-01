import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';

type LocationResult = {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  source: 'gps' | 'ip';
};

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/attendance`;
  todayStatus$ = new BehaviorSubject<any | null>(null);

  constructor(private http: HttpClient) {}

  getTodayStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/today/status`).pipe(
      tap((result) => this.todayStatus$.next(result)),
    );
  }

  checkIn(
    lat?: number,
    lng?: number,
    city?: string,
    country?: string,
    workMode = 'office',
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/check-in`, {
      latitude: lat,
      longitude: lng,
      city,
      country,
      work_mode: workMode,
    }).pipe(
      tap(() => this.getTodayStatus().subscribe()),
    );
  }

  checkOut(lat?: number, lng?: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/check-out`, {
      latitude: lat,
      longitude: lng,
    }).pipe(
      tap(() => this.getTodayStatus().subscribe()),
    );
  }

  getMyAttendance(year: number, month: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/my?year=${year}&month=${month}`);
  }

  getMySummary(year: number, month: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/my/summary?year=${year}&month=${month}`);
  }

  getTodayAll(): Observable<any> {
    return this.http.get(`${this.apiUrl}/today`);
  }

  getTeamToday(): Observable<any> {
    return this.http.get(`${this.apiUrl}/team/today`);
  }

  getTodayStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/today`);
  }

  getAllSummaries(year: number, month: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all?year=${year}&month=${month}`);
  }

  getUserAttendance(userId: string, year: number, month: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all?user_id=${userId}&year=${year}&month=${month}`);
  }

  getLocation(): Promise<LocationResult> {
    return new Promise((resolve, reject) => {
      const fallbackToIpLocation = () => {
        this.http.get<any>(environment.ipGeoUrl).subscribe({
          next: (response) => {
            resolve({
              lat: response.lat,
              lng: response.lon,
              city: response.city,
              country: response.country,
              source: 'ip',
            });
          },
          error: reject,
        });
      };

      if (!navigator.geolocation) {
        fallbackToIpLocation();
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            source: 'gps',
          });
        },
        fallbackToIpLocation,
        {
          enableHighAccuracy: false,
          timeout: 4000,
          maximumAge: 300000,
        },
      );
    });
  }
}
