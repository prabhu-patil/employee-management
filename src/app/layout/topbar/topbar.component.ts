import { CommonModule } from '@angular/common';
import { Component, EventEmitter, HostListener, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { AttendanceService } from '../../core/services/attendance.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <button class="hamburger-button" type="button" aria-label="Open navigation" (click)="menuToggle.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div class="breadcrumb">
          <span class="page-title">{{ currentPageTitle }}</span>
          <span *ngIf="currentSubPath" class="sub-path">/ {{ currentSubPath }}</span>
        </div>
      </div>

      <div class="topbar-right">
        <button
          class="status-pill"
          type="button"
          [class.checked-in]="isCheckedIn"
          [class.not-checked-in]="!isCheckedIn"
          (click)="navigateToAttendance()"
        >
          <span class="status-dot"></span>
          <span>{{ statusText }}</span>
        </button>

        <button class="notification-button" type="button" aria-label="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span *ngIf="unreadCount > 0" class="unread-dot"></span>
        </button>

        <div class="user-menu">
          <button
            class="user-button"
            type="button"
            aria-haspopup="menu"
            [attr.aria-expanded]="userMenuOpen"
            (click)="toggleUserMenu($event)"
          >
            <ng-container *ngIf="currentUser$ | async as user">
              <span class="avatar" [style.background]="getAvatarColor(user.role)">
                {{ getInitials(user.name) }}
              </span>
              <span class="user-name">{{ user.name }}</span>
            </ng-container>
            <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          <div *ngIf="userMenuOpen" class="dropdown-card" role="menu">
            <a routerLink="/profile" role="menuitem" (click)="closeUserMenu()">My Profile</a>
            <button type="button" role="menuitem" (click)="logout()">Logout</button>
          </div>
        </div>
      </div>
    </header>
  `,
  styles: [`
    :host {
      display: block;
      flex: 0 0 auto;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      height: 56px;
      padding: 0 18px;
      background: #FFFFFF;
      border-bottom: 1px solid #E5E7EB;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .topbar-left,
    .topbar-right {
      display: flex;
      align-items: center;
      min-width: 0;
    }

    .topbar-left {
      gap: 12px;
    }

    .topbar-right {
      gap: 12px;
    }

    .hamburger-button,
    .notification-button,
    .user-button,
    .dropdown-card button {
      font: inherit;
    }

    .hamburger-button {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #9CA3AF;
      cursor: pointer;
    }

    .hamburger-button:hover {
      background: #F3F4F6;
      color: #6B7280;
    }

    .hamburger-button svg {
      width: 21px;
      height: 21px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-width: 2;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
      white-space: nowrap;
    }

    .page-title {
      overflow: hidden;
      color: #111827;
      font-size: 14px;
      font-weight: 500;
      line-height: 1.2;
      text-overflow: ellipsis;
    }

    .sub-path {
      overflow: hidden;
      color: #9CA3AF;
      font-size: 13px;
      line-height: 1.2;
      text-overflow: ellipsis;
    }

    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      height: 32px;
      padding: 0 11px;
      border: 0;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 600;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
    }

    .status-pill.checked-in {
      background: #DCFCE7;
      color: #166534;
    }

    .status-pill.not-checked-in {
      background: #FEF3C7;
      color: #92400E;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 999px;
      background: currentColor;
    }

    .notification-button {
      position: relative;
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #9CA3AF;
      cursor: pointer;
    }

    .notification-button:hover {
      background: #F3F4F6;
      color: #6B7280;
    }

    .notification-button svg {
      width: 19px;
      height: 19px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .unread-dot {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 7px;
      height: 7px;
      border: 1px solid #FFFFFF;
      border-radius: 999px;
      background: #EF4444;
    }

    .user-menu {
      position: relative;
    }

    .user-button {
      display: flex;
      align-items: center;
      gap: 8px;
      max-width: 220px;
      height: 38px;
      padding: 3px 6px 3px 4px;
      border: 0;
      border-radius: 10px;
      background: transparent;
      cursor: pointer;
    }

    .user-button:hover {
      background: #F3F4F6;
    }

    .avatar {
      display: grid;
      flex: 0 0 30px;
      place-items: center;
      width: 30px;
      height: 30px;
      border-radius: 999px;
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
    }

    .user-name {
      overflow: hidden;
      color: #111827;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .chevron {
      flex: 0 0 16px;
      width: 16px;
      height: 16px;
      fill: none;
      stroke: #9CA3AF;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    .dropdown-card {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      z-index: 60;
      width: 170px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      border-radius: 10px;
      background: #FFFFFF;
      box-shadow: 0 18px 36px rgba(15, 23, 42, 0.14);
    }

    .dropdown-card a,
    .dropdown-card button {
      display: flex;
      width: 100%;
      align-items: center;
      min-height: 40px;
      padding: 0 13px;
      border: 0;
      background: transparent;
      color: #374151;
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
    }

    .dropdown-card a {
      border-bottom: 1px solid #E5E7EB;
    }

    .dropdown-card a:hover,
    .dropdown-card button:hover {
      background: #F9FAFB;
      color: #111827;
    }

    .dropdown-card button {
      color: #DC2626;
    }

    @media (max-width: 720px) {
      .topbar {
        padding-inline: 12px;
      }

      .status-pill span:last-child,
      .user-name,
      .sub-path {
        display: none;
      }

      .topbar-right {
        gap: 6px;
      }
    }
  `]
})
export class TopbarComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();

  currentUser$ = this.authService.currentUser$;
  todayStatus$ = this.attendanceService.getTodayStatus();
  currentPageTitle = 'EmpTrack';
  currentSubPath = '';
  userMenuOpen = false;
  unreadCount = 0;

  private todayStatus: any = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private attendanceService: AttendanceService,
  ) {}

  ngOnInit(): void {
    this.updateBreadcrumb(this.router.url);

    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).url),
    ).subscribe((url) => this.updateBreadcrumb(url));

    this.todayStatus$.subscribe((status) => {
      this.todayStatus = status;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-menu')) {
      this.closeUserMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeUserMenu();
  }

  get isCheckedIn(): boolean {
    return Boolean(this.getCheckInValue());
  }

  get statusText(): string {
    const checkIn = this.getCheckInValue();
    if (!checkIn) {
      return 'Not checked in';
    }

    const time = new Date(checkIn).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `Checked in ${time}`;
  }

  getInitials(name: string | undefined): string {
    const parts = (name || 'User').trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part.charAt(0)).join('').toUpperCase();
  }

  getAvatarColor(role: string | undefined): string {
    const colors: Record<string, string> = {
      admin: '#7C3AED',
      hr: '#2563EB',
      manager: '#059669',
      employee: '#64748B',
    };
    return colors[(role || 'employee').toLowerCase()] || colors['employee'];
  }

  navigateToAttendance(): void {
    this.router.navigate(['/attendance']);
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout();
  }

  private getCheckInValue(): string | Date | null {
    return this.todayStatus?.checkIn || this.todayStatus?.check_in || null;
  }

  private updateBreadcrumb(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    const routeTitles: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/attendance': 'Attendance',
      '/employees': 'Employees',
      '/leave': 'Leave Management',
      '/reports': 'Reports',
      '/profile': 'My Profile',
    };

    this.currentPageTitle = routeTitles[path] || 'EmpTrack';
    this.currentSubPath = path.includes('/') ? path.split('/').filter(Boolean).slice(1).join(' / ') : '';
  }
}
