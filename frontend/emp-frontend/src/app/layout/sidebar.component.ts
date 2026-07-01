import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../core/services/auth.service';
import { resolveAvatarUrl } from '../core/utils/avatar.util';

interface NavItem {
  label: string;
  icon: string;
  route?: string;
  disabled?: boolean;
  children?: SubNavItem[];
}

interface SubNavItem {
  label: string;
  route: string;
  exact?: boolean;
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
        <!-- Brand -->
        <div class="brand">
          <span class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 20V8.5L12 4l8 4.5V20h-5v-6H9v6H4Z"/></svg>
          </span>
          <span *ngIf="!collapsed" class="brand-text">AGENT LABS</span>
        </div>

        <!-- User profile card -->
        <div *ngIf="!collapsed" class="profile-card">
          <div class="avatar-wrap">
            <span class="avatar" *ngIf="!(currentUser$ | async)?.avatar_url">{{ getInitials() }}</span>
            <img class="avatar-img" *ngIf="(currentUser$ | async)?.avatar_url as src" [src]="avatarSrc(src)" alt="" />
          </div>
          <strong class="profile-name">{{ getUserName() }}</strong>
          <span class="profile-role">{{ getRole() }}</span>
        </div>

        <div *ngIf="!collapsed" class="section-label">Main</div>

        <!-- Nav -->
        <nav class="nav" aria-label="Primary navigation">
          <ng-container *ngFor="let item of navItems">
            <!-- Item with children (expandable group) -->
            <ng-container *ngIf="item.children?.length; else flatItem">
              <button
                type="button"
                class="nav-link group-toggle"
                [class.active]="isGroupActive(item)"
                [attr.title]="collapsed ? item.label : null"
                (click)="toggleGroup(item.label)"
              >
                <span class="nav-icon" [innerHTML]="getIcon(item.icon)"></span>
                <span *ngIf="!collapsed" class="nav-label">{{ item.label }}</span>
                <svg *ngIf="!collapsed" class="nav-chevron"
                     [class.open]="isGroupOpen(item.label)"
                     viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6"/>
                </svg>
              </button>

              <div class="subnav" *ngIf="!collapsed && isGroupOpen(item.label)">
                <a *ngFor="let sub of item.children"
                   class="sub-link"
                   routerLinkActive="active"
                   [routerLinkActiveOptions]="{ exact: !!sub.exact }"
                   [routerLink]="sub.route"
                   (click)="onNavClick()">
                  <span class="sub-dot"></span>
                  <span class="sub-label">{{ sub.label }}</span>
                </a>
              </div>
            </ng-container>

            <!-- Flat item (no children) -->
            <ng-template #flatItem>
              <a
                *ngIf="item.route && !item.disabled"
                class="nav-link"
                routerLinkActive="active"
                [routerLink]="item.route"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                [attr.title]="collapsed ? item.label : null"
                (click)="onNavClick()"
              >
                <span class="nav-icon" [innerHTML]="getIcon(item.icon)"></span>
                <span *ngIf="!collapsed" class="nav-label">{{ item.label }}</span>
                <svg *ngIf="!collapsed" class="nav-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6"/>
                </svg>
              </a>

              <button
                *ngIf="!item.route || item.disabled"
                type="button"
                class="nav-link disabled"
                [attr.title]="collapsed ? item.label : null"
                disabled
              >
                <span class="nav-icon" [innerHTML]="getIcon(item.icon)"></span>
                <span *ngIf="!collapsed" class="nav-label">{{ item.label }}</span>
                <svg *ngIf="!collapsed" class="nav-chevron" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="m9 6 6 6-6 6"/>
                </svg>
              </button>
            </ng-template>
          </ng-container>
        </nav>
      </aside>
    </div>
  `,
  styles: [`
    :host { display: contents; }
    .sidebar-shell { display: contents; }

    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      z-index: 40;
      border: 0;
      background: rgb(15 23 42 / 0.42);
    }

    .sidebar {
      position: sticky;
      top: 0;
      z-index: 50;
      display: flex;
      flex-direction: column;
      width: 240px;
      height: 100vh;
      background: #FFFFFF;
      color: #1E293B;
      border-right: 1px solid #E5E7EB;
      transition: width 250ms cubic-bezier(0.4, 0, 0.2, 1), transform 250ms cubic-bezier(0.4, 0, 0.2, 1);
      overflow-y: auto;
    }

    .sidebar.collapsed { width: 72px; }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 18px 20px;
      border-bottom: 1px solid #F1F5F9;
    }
    .collapsed .brand { justify-content: center; padding-inline: 12px; }

    .brand-mark {
      display: grid;
      flex: 0 0 32px;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: linear-gradient(135deg, #F97316, #EF4444);
      color: #FFFFFF;
    }
    .brand-mark svg { width: 18px; height: 18px; fill: currentColor; }

    .brand-text {
      font-size: 15px;
      font-weight: 800;
      color: #0F172A;
      letter-spacing: 0.02em;
    }

    .profile-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 18px 16px 16px;
      border-bottom: 1px solid #F1F5F9;
    }

    .avatar-wrap { width: 64px; height: 64px; }
    .avatar, .avatar-img {
      width: 64px; height: 64px;
      border-radius: 999px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, #818CF8, #6366F1);
      color: #FFFFFF;
      font-size: 22px; font-weight: 700;
      object-fit: cover;
    }

    .profile-name { font-size: 14px; font-weight: 700; color: #0F172A; margin-top: 4px; }
    .profile-role {
      font-size: 11px; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.06em;
      color: #94A3B8;
    }

    .section-label {
      padding: 14px 20px 6px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #94A3B8;
    }

    .nav {
      flex: 1;
      padding: 4px 12px 14px;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      min-height: 40px;
      padding: 8px 12px;
      border-radius: 10px;
      background: transparent;
      color: #475569;
      border: 0;
      font-weight: 500;
      font-family: inherit;
      font-size: 13.5px;
      text-align: left;
      text-decoration: none;
      cursor: pointer;
      transition: background-color 160ms ease, color 160ms ease;
    }

    .nav-link:hover:not(.disabled) {
      background: #F1F5F9;
      color: #0F172A;
    }

    .nav-link.active {
      background: #EEF2FF;
      color: #4338CA;
      font-weight: 600;
    }

    .nav-link.active .nav-icon { color: #4338CA; }

    .nav-link.disabled {
      cursor: not-allowed;
      opacity: 0.55;
    }

    .collapsed .nav-link { justify-content: center; padding: 8px; }

    .nav-icon {
      display: grid;
      flex: 0 0 20px;
      place-items: center;
      width: 20px; height: 20px;
      color: #64748B;
    }

    .nav-link.active .nav-icon,
    .nav-link:hover:not(.disabled) .nav-icon { color: inherit; }

    .nav-icon svg {
      width: 18px; height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .nav-label { flex: 1; min-width: 0; line-height: 1.2; }

    .nav-chevron {
      width: 14px; height: 14px;
      flex: 0 0 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      opacity: 0.5;
      transition: transform 200ms ease;
    }

    .nav-chevron.open {
      transform: rotate(90deg);
    }

    /* Sub-menu */
    .subnav {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: 4px 0 6px 16px;
      margin-left: 14px;
      border-left: 1px solid #E2E8F0;
    }

    .sub-link {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 32px;
      padding: 6px 10px;
      border-radius: 8px;
      color: #64748B;
      font-size: 12.5px;
      font-weight: 500;
      text-decoration: none;
      transition: background-color 160ms ease, color 160ms ease;
    }

    .sub-link:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .sub-link.active {
      color: #4338CA;
      font-weight: 600;
      background: transparent;
    }

    .sub-link.active .sub-dot {
      background: #4338CA;
    }

    .sub-dot {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: #CBD5E1;
      flex: 0 0 6px;
    }

    .sub-label { flex: 1; }

    @media (max-width: 1023px) {
      .sidebar {
        position: fixed;
        inset: 0 auto 0 0;
        transform: translateX(-100%);
      }
      .sidebar.mobile-open { transform: translateX(0); }
    }
  `]
})
export class SidebarComponent implements OnInit {
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Output() closeMobile = new EventEmitter<void>();

  navItems: NavItem[] = [];
  currentUser$: AuthService['currentUser$'];
  private openGroups = new Set<string>();

  constructor(private authService: AuthService, private router: Router) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngOnInit(): void {
    this.authService.currentUser$.subscribe((user) => {
      this.buildNav(user?.role || 'employee');
      this.autoOpenActiveGroup(this.router.url);
    });
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.autoOpenActiveGroup(this.router.url);
    });
  }

  private currentUser(): any {
    let user: any = null;
    this.authService.currentUser$.subscribe((u) => (user = u)).unsubscribe();
    return user;
  }

  getInitials(): string {
    const name = this.getUserName();
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'U';
  }

  getUserName(): string {
    const u = this.currentUser();
    return u?.full_name || u?.name || 'User';
  }

  getRole(): string {
    const role = this.currentUser()?.role || 'employee';
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  avatarSrc(url: string | undefined | null): string {
    return resolveAvatarUrl(url);
  }

  onNavClick(): void {
    if (this.mobileOpen) this.closeMobile.emit();
  }

  toggleGroup(label: string): void {
    if (this.openGroups.has(label)) this.openGroups.delete(label);
    else this.openGroups.add(label);
  }

  isGroupOpen(label: string): boolean {
    return this.openGroups.has(label);
  }

  isGroupActive(item: NavItem): boolean {
    if (!item.children) return false;
    return item.children.some((s) => this.router.url.startsWith(s.route));
  }

  private autoOpenActiveGroup(url: string): void {
    for (const item of this.navItems) {
      if (item.children?.some((s) => url.startsWith(s.route))) {
        this.openGroups.add(item.label);
      }
    }
  }

  getIcon(icon: string): string {
    const icons: Record<string, string> = {
      dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/></svg>',
      apps: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
      employees: '<svg viewBox="0 0 24 24"><path d="M16 19c0-2.2-1.8-4-4-4H7c-2.2 0-4 1.8-4 4"/><circle cx="9.5" cy="8" r="3.5"/><path d="M21 19c0-1.9-1.3-3.5-3.1-3.9"/><path d="M16 4.3a3.5 3.5 0 0 1 0 6.4"/></svg>',
      leave: '<svg viewBox="0 0 24 24"><path d="M7 3v4M17 3v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/></svg>',
      attendance: '<svg viewBox="0 0 24 24"><path d="M12 6v6l3 2"/><circle cx="12" cy="12" r="9"/></svg>',
      projects: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>',
      holidays: '<svg viewBox="0 0 24 24"><path d="M12 2v4M5 5l3 3M19 5l-3 3M3 12h4M17 12h4M12 18v4"/><circle cx="12" cy="12" r="4"/></svg>',
      clients: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 19c0-3 2.5-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.5"/></svg>',
      payroll: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M14 9h-3a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9"/><path d="M12 7v2M12 15v2"/></svg>',
      reports: '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/></svg>',
    };
    return icons[icon] || icons['dashboard'];
  }

  private buildNav(role: string): void {
    const isHr = ['admin', 'hr'].includes(role);

    const dashboardItem: NavItem = isHr
      ? {
          label: 'Dashboard',
          icon: 'dashboard',
          children: [
            { label: 'HR Dashboard', route: '/dashboard', exact: true },
            { label: 'Employee Dashboard', route: '/dashboard/employee' },
          ],
        }
      : { label: 'Dashboard', icon: 'dashboard', route: '/dashboard/employee' };

    const attendanceItem: NavItem = isHr
      ? {
          label: 'Attendance',
          icon: 'attendance',
          children: [
            { label: 'Admin Attendance', route: '/attendance', exact: true },
            { label: 'Employee Attendance', route: '/attendance/employee' },
          ],
        }
      : { label: 'Attendance', icon: 'attendance', route: '/attendance/employee' };

    this.navItems = [
      dashboardItem,
      ...(isHr ? [{ label: 'Employees', icon: 'employees', route: '/employees' } as NavItem] : []),
      { label: 'Projects', icon: 'projects', route: '/projects' },
      { label: 'Leave Management', icon: 'leave', route: '/leave' },
      attendanceItem,
      { label: 'Holidays', icon: 'holidays', route: '/holidays' },
    ];
  }
}
