import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface EmployeeListItem {
  id: string;
  email: string;
  full_name: string;
  role: string;
  employee_id: string;
  department_id?: string;
  department_name: string;
  is_active: boolean;
  avatar_url?: string;
  phone?: string;
}

export interface CreateEmployeeData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  department_id?: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  hire_date?: string;
}

export interface UpdateEmployeeData {
  full_name?: string;
  role?: string;
  department_id?: string;
  phone?: string;
  address?: string;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  getAll(filters?: { search?: string; role?: string; departmentId?: string; isActive?: boolean }): Observable<EmployeeListItem[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.role) params = params.set('role', filters.role);
      if (filters.departmentId) params = params.set('department_id', filters.departmentId);
      if (filters.isActive !== undefined) params = params.set('is_active', filters.isActive.toString());
    }
    return this.http.get<EmployeeListItem[]>(`${this.apiUrl}/`, { params });
  }

  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  getMyProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/me/profile`);
  }

  create(data: CreateEmployeeData): Observable<any> {
    return this.http.post(`${this.apiUrl}/`, data);
  }

  update(id: string, data: UpdateEmployeeData): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deactivate(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  uploadAvatar(id: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/${id}/avatar`, formData);
  }

  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/departments/`);
  }

  createDepartment(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/departments/`, data);
  }
}
