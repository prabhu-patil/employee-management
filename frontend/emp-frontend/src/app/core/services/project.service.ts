import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type ProjectTag = 'web' | 'android' | 'ios' | 'backend' | 'testing' | 'design';
export type ProjectPriority = 'low' | 'medium' | 'high';
export type ProjectStatus = 'new' | 'running' | 'finished' | 'on_hold';

export interface Project {
  id: string;
  name: string;
  tag: ProjectTag;
  description: string | null;
  team_leader: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  deadline: string | null;
  progress: number;
  comments_count: number;
  bugs_count: number;
  created_by: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ProjectCreate {
  name: string;
  tag: ProjectTag;
  description?: string | null;
  team_leader: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  deadline?: string | null;
  progress?: number;
  comments_count?: number;
  bugs_count?: number;
}

@Injectable({ providedIn: 'root' })
export class ProjectService {
  private apiUrl = `${environment.apiUrl}/projects`;

  constructor(private http: HttpClient) {}

  list(): Observable<Project[]> {
    return this.http.get<Project[]>(this.apiUrl);
  }

  create(data: ProjectCreate): Observable<Project> {
    return this.http.post<Project>(this.apiUrl, data);
  }

  update(id: string, data: Partial<ProjectCreate>): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
