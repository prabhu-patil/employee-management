import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<any>(null);
  currentUser$ = this.currentUserSubject.asObservable();
  private apiUrl = environment.apiUrl;
  private initializationRequest?: Observable<boolean>;

  constructor(private http: HttpClient, private router: Router) {}

  setSession(response: any): void {
    localStorage.setItem('access_token', response.access_token);
    localStorage.setItem('refresh_token', response.refresh_token);
    localStorage.setItem('user_role', response.role);
    localStorage.setItem('full_name', response.full_name);
    localStorage.setItem('user_id', response.user_id);
    if (!localStorage.getItem('login_at')) {
      localStorage.setItem('login_at', String(Date.now()));
    }
    this.currentUserSubject.next({
      id: response.user_id,
      role: response.role,
      full_name: response.full_name
    });
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('full_name');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_email');
    localStorage.removeItem('avatar_url');
    localStorage.removeItem('login_at');
    this.currentUserSubject.next(null);
    this.initializationRequest = undefined;
  }

  private restoreUserFromStorage(): boolean {
    const role = localStorage.getItem('user_role');
    const fullName = localStorage.getItem('full_name');
    const userId = localStorage.getItem('user_id');
    const email = localStorage.getItem('user_email');
    const avatarUrl = localStorage.getItem('avatar_url');

    if (!role || !fullName) {
      return false;
    }

    this.currentUserSubject.next({
      id: userId,
      role,
      full_name: fullName,
      email,
      avatar_url: avatarUrl,
    });
    return true;
  }

  private loadCurrentUser(): Observable<boolean> {
    return this.http.get(`${this.apiUrl}/auth/me`).pipe(
      tap((user: any) => {
        this.currentUserSubject.next(user);
        localStorage.setItem('user_role', user.role);
        localStorage.setItem('full_name', user.full_name);
        localStorage.setItem('user_id', user.id);
        if (user.email) {
          localStorage.setItem('user_email', user.email);
        }
        if (user.avatar_url) {
          localStorage.setItem('avatar_url', user.avatar_url);
        }
      }),
      map(() => true),
      catchError(() => {
        this.clearSession();
        return of(false);
      })
    );
  }

  login(email: string, password: string, latitude?: number, longitude?: number, city?: string, country?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/login`, {
      email,
      password,
      latitude,
      longitude,
      city,
      country
    });
  }

  clearSessionPublic(): void {
    this.clearSession();
  }

  updateCurrentUser(patch: Record<string, any>): void {
    const current = this.currentUserSubject.value;
    if (!current) return;
    const next = { ...current, ...patch };
    this.currentUserSubject.next(next);
    if (typeof patch['avatar_url'] === 'string') {
      localStorage.setItem('avatar_url', patch['avatar_url']);
    }
    if (typeof patch['full_name'] === 'string') {
      localStorage.setItem('full_name', patch['full_name']);
    }
  }

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/register`, data);
  }

  logout(): void {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout`, { refresh_token: refreshToken }).subscribe();
    }
    this.clearSession();
    this.router.navigate(['/login']);
  }

  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      this.clearSession();
      return throwNoRefreshToken();
    }

    return this.http.post(`${this.apiUrl}/auth/refresh`, { refresh_token: refreshToken }).pipe(
      tap((response: any) => {
        this.setSession(response);
      })
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token') || !!localStorage.getItem('refresh_token');
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  getUserRole(): string | null {
    const user = this.currentUserSubject.value;
    return user ? user.role : localStorage.getItem('user_role');
  }

  initializeUser(): Observable<boolean> {
    const token = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    this.restoreUserFromStorage();

    if (!token && !refreshToken) {
      this.clearSession();
      return of(false);
    }

    if (this.initializationRequest) {
      return this.initializationRequest;
    }

    this.initializationRequest = (token
      ? this.loadCurrentUser()
      : this.refreshToken().pipe(switchMap(() => this.loadCurrentUser()), map(() => true))
    ).pipe(
      catchError(() => {
        this.clearSession();
        return of(false);
      }),
      tap(() => {
        this.initializationRequest = undefined;
      })
    );

    return this.initializationRequest;
  }

  ensureAuthenticated(): Observable<boolean> {
    if (this.currentUserSubject.value && this.isLoggedIn()) {
      return of(true);
    }

    return this.initializeUser();
  }
}

function throwNoRefreshToken(): Observable<never> {
  return new Observable((subscriber) => {
    subscriber.error(new Error('No refresh token available'));
  });
}
