import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type HolidayShift = 'all_shifts' | 'day_shift' | 'night_shifts';
export type HolidayType = 'national' | 'religious' | 'cultural' | 'awareness' | 'environmental';
export type HolidayStatus = 'pending' | 'approved';

export interface Holiday {
  id: string;
  holiday_no: string;
  name: string;
  shift: HolidayShift;
  holiday_date: string;
  location: string | null;
  holiday_type: HolidayType;
  status: HolidayStatus;
  details: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface HolidayCreate {
  holiday_no: string;
  name: string;
  shift: HolidayShift;
  holiday_date: string;
  location?: string | null;
  holiday_type: HolidayType;
  status?: HolidayStatus;
  details?: string | null;
}

@Injectable({ providedIn: 'root' })
export class HolidayService {
  private apiUrl = `${environment.apiUrl}/holidays`;

  constructor(private http: HttpClient) {}

  list(): Observable<Holiday[]> {
    return this.http.get<Holiday[]>(this.apiUrl);
  }

  create(data: HolidayCreate): Observable<Holiday> {
    return this.http.post<Holiday>(this.apiUrl, data);
  }

  update(id: string, data: Partial<HolidayCreate>): Observable<Holiday> {
    return this.http.put<Holiday>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
