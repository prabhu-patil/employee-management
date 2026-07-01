import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type LeaveType = 'annual' | 'sick' | 'casual' | 'unpaid';
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface LeaveRequestItem {
  id: string;
  user_id: string;
  employee_name: string;
  employee_email: string;
  employee_id?: string | null;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: LeaveStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at: string;
}

export interface ApplyLeavePayload {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class LeaveService {
  private apiUrl = `${environment.apiUrl}/leaves`;

  constructor(private http: HttpClient) {}

  apply(payload: ApplyLeavePayload): Observable<LeaveRequestItem> {
    return this.http.post<LeaveRequestItem>(`${this.apiUrl}/apply`, payload);
  }

  getMyLeaves(): Observable<LeaveRequestItem[]> {
    return this.http.get<LeaveRequestItem[]>(`${this.apiUrl}/my`);
  }

  getTeamLeaves(): Observable<LeaveRequestItem[]> {
    return this.http.get<LeaveRequestItem[]>(`${this.apiUrl}/team`);
  }

  approve(id: string): Observable<LeaveRequestItem> {
    return this.http.put<LeaveRequestItem>(`${this.apiUrl}/${id}/approve`, {});
  }

  reject(id: string): Observable<LeaveRequestItem> {
    return this.http.put<LeaveRequestItem>(`${this.apiUrl}/${id}/reject`, {});
  }
}
