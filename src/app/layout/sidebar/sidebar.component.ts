import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  pendingCount?: number;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="sidebar-shell">
      <button
        *ngIf="mobileOpen"
        type="button"
        class="sidebar-backdrop"
        aria-label="Close navigation"
        (click)="closeMobile.emit()"
      ></button>

      <aside class="sidebar" [class.collapsed]="collapsed" [class.mobile-open]="mobileOpen">
        <div class="logo-area">
          <span class="logo-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20V8.5L12 4l8 4.5V20h-5v-6H9v6H4Z" />
            </svg>
          </span>
          <span *ngIf="!collapsed" class="logo-text">EmpTrack</span>
        </div>

        <nav class="nav-groups" aria-label="Primary navigation">
          <section *ngFor="let section of navSections" class="nav-section">
            <p *ngIf="!collapsed" class="nav-section-label">{{ section.label }}</p>
            <a
              *ngFor="let item of section.items"
              class="nav-link"
              routerLinkActive="active"
              [routerLink]="item.route"
              [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              [attr.title]="collapsed ? item.label : null"
              (click)="onNavClick()"
            >
              <span class="nav-icon" [innerHTML]="getIcon(item.icon)"></span>
              <span *ngIf="!collapsed" class="nav-label">{{ item.label }}</span>
              <span *ngIf="!collapsed && item.pendingCount" class="pending-badge">{{ item.pendingCount }}</span>
            </a>
          </section>
        </nav>

        <div class="user-area" *ngIf="currentUser$ | async as user">
          <div class="avatar" aria-hidden="true">{{ getInitial(user.name) }}</div>
          <div *ngIf="!collapsed" class="user-copy">
            <p>{{ user.name }}</p>
            <span>{{ user.role }}</span>
          </div>
          <button *ngIf="!collapsed" class="settings-button" type="button" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
              <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 0 1-2.82 2.82l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21a2 2 0 0 1-4 0v-.08A1.8 1.8 0 0 0 8.76 19a1.8 1.8 0 0 0-1.98.36l-.04.04a2 2 0 1 1-2.82-2.82l.04-.04A1.8 1.8 0 0 0 4.32 14a1.8 1.8 0 0 0-1.66-1.1H2.6a2 2 0 0 1 0-4h.08A1.8 1.8 0 0 0 4.34 7.8a1.8 1.8 0 0 0-.36-1.98l-.04-.04A2 2 0 1 1 6.76 3l.04.04a1.8 1.8 0 0 0 1.98.36h.02A1.8 1.8 0 0 0 9.9 1.74V1.7a2 2 0 0 1 4 0v.08a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2 2 0 0 1 2.82 2.82l-.04.04a1.8 1.8 0 0 0-.36 1.98v.02a1.8 1.8 0 0 0 1.66 1.1h.08a2 2 0 0 1 0 4h-.08A1.8 1.8 0 0 0 19.4 15Z" />
            </svg>
          </button>
        </div>
      </aside>
    </div>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .sidebar-shell {
      display: contents;
    }

    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      border: 0;
      background: rgb(17 24 39 / 0.42);
    }

    .sidebar {
      position: relative;
      z-index: 50;
      display: flex;
      flex-direction: column;
      width: 240px;
      height: 100%;
      background: #FFFFFF;
      border-right: 1px solid #E5E7EB;
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.04);
      transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    .sidebar.collapsed {
      width: 60px;
    }

    .logo-area {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 60px;
      padding: 16px;
      border-bottom: 1px solid #E5E7EB;
    }

    .collapsed .logo-area {
      justify-content: center;
      padding-inline: 0;
    }

    .logo-mark {
      display: grid;
      flex: 0 0 28px;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #2563EB;
      color: #FFFFFF;
    }

    .logo-mark svg {
      width: 17px;
      height: 17px;
      fill: currentColor;
    }

    .logo-text {
      color: #111827;
      font-size: 15px;
      font-weight: 600;
      line-height: 1;
    }

    .nav-groups {
      flex: 1;
      overflow-y: auto;
      padding: 14px 10px;
    }

    .collapsed .nav-groups {
      padding-inline: 8px;
    }

    .nav-section + .nav-section {
      margin-top: 18px;
    }

    .nav-section-label {
      margin: 0 0 7px;
      padding-inline: 10px;
      color: #9CA3AF;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      line-height: 1.2;
      text-transform: uppercase;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 36px;
      padding: 8px 10px;
      border-radius: 8px;
      color: #6B7280;
      text-decoration: none;
      transition: background-color 160ms ease, color 160ms ease, font-weight 160ms ease;
    }

    .nav-link:hover {
      background: #F3F4F6;
      color: #374151;
    }

    .nav-link.active {
      background: #EFF6FF;
      color: #2563EB;
      font-weight: 500;
    }

    .collapsed .nav-link {
      justify-content: center;
      width: 44px;
      height: 36px;
      padding: 0;
    }

    .collapsed .nav-link.active {
      background: transparent;
    }

    .nav-icon {
      display: grid;
      flex: 0 0 18px;
      place-items: center;
      width: 18px;
      height: 18px;
      color: currentColor;
    }

    .collapsed .nav-link.active .nav-icon {
      width: 34px;
      height: 30px;
      border-radius: 999px;
      background: #EFF6FF;
      color: #2563EB;
    }

    .nav-icon svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .nav-label {
      min-width: 0;
      flex: 1;
      font-size: 13px;
      line-height: 1.2;
    }

    .pending-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 18px;
      padding: 0 6px;
      border-radius: 10px;
      background: #FEF3C7;
      color: #92400E;
      font-size: 10px;
      font-weight: 600;
      line-height: 1;
    }

    .user-area {
      display: flex;
      align-items: center;
      gap: 9px;
      min-height: 66px;
      padding: 12px;
      border-top: 1px solid #E5E7EB;
    }

    .collapsed .user-area {
      justify-content: center;
      padding-inline: 0;
    }

    .avatar {
      display: grid;
      flex: 0 0 32px;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 999px;
      background: #DBEAFE;
      color: #2563EB;
      font-size: 12px;
      font-weight: 700;
    }

    .user-copy {
      min-width: 0;
      flex: 1;
    }

    .user-copy p {
      margin: 0;
      overflow: hidden;
      color: #111827;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.25;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-copy span {
      display: block;
      margin-top: 2px;
      overflow: hidden;
      color: #9CA3AF;
      font-size: 10px;
      line-height: 1.2;
      text-overflow: ellipsis;
      text-transform: capitalize;
      white-space: nowrap;
    }

    .settings-button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #9CA3AF;
      cursor: pointer;
    }

    .settings-button:hover {
      background: #F3F4F6;
      color: #6B7280;
    }

    .settings-button svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.7;
    }

    @media (max-width: 1023px) {
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        transform: translateX(-100%);
      }

      .sidebar.mobile-open {
        transform: translateX(0);
      }
    }
  `]
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() closeMobile = new EventEmitter<void>();

  navSections: NavSection[] = [];
  currentUser$ = this.authService.currentUser$;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.buildNavSections(user?.role || 'employee');
    });
  }

  getInitial(name: string | undefined): string {
    return (name || 'U').trim().charAt(0).toUpperCase();
  }

  onNavClick(): void {
    if (this.mobileOpen) {
      this.closeMobile.emit();
    }
  }

  getIcon(icon: string): string {
    const icons: Record<string, string> = {
      dashboard: '<svg viewBox="0 0 24 24"><path d="M4 13h6V4H4v9ZM14 20h6v-9h-6v9ZM4 20h6v-3H4v3ZM14 7h6V4h-6v3Z"/></svg>',
      attendance: '<svg viewBox="0 0 24 24"><path d="M12 6v6l3 2"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>',
      employees: '<svg viewBox="0 0 24 24"><path d="M16 19c0-2.2-1.8-4-4-4H7c-2.2 0-4 1.8-4 4"/><path d="M9.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M21 19c0-1.9-1.3-3.5-3.1-3.9"/><path d="M16 4.3a3.5 3.5 0 0 1 0 6.4"/></svg>',
      leave: '<svg viewBox="0 0 24 24"><path d="M7 3v4M17 3v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/><path d="m9 15 2 2 4-5"/></svg>',
      reports: '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/></svg>',
      profile: '<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 1 0-16 0"/><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>',
    };
    return icons[icon] || icons.dashboard;
  }

  private buildNavSections(role: string): void {
    const canSeeManagement = ['admin', 'hr', 'manager'].includes(role);
    const canSeeHr = ['admin', 'hr'].includes(role);

    const mainItems: NavItem[] = [
      ...(canSeeManagement ? [{ label: 'Dashboard', icon: 'dashboard', route: '/dashboard' }] : []),
      { label: 'Attendance', icon: 'attendance', route: '/attendance' },
      { label: 'My Profile', icon: 'profile', route: '/profile' },
    ];

    const hrItems: NavItem[] = [
      ...(canSeeHr ? [{ label: 'Employees', icon: 'employees', route: '/employees' }] : []),
      { label: 'Leave', icon: 'leave', route: '/leave', pendingCount: canSeeHr ? 3 : undefined },
    ];

    const reportItems: NavItem[] = canSeeHr
      ? [{ label: 'Reports', icon: 'reports', route: '/reports' }]
      : [];

    this.navSections = [
      { label: 'Main', items: mainItems },
      { label: 'HR', items: hrItems },
      ...(reportItems.length ? [{ label: 'Reports', items: reportItems }] : []),
    ];
  }
}
