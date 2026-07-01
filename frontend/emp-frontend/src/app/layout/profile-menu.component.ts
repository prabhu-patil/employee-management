import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

import { AuthService } from '../core/services/auth.service';
import { resolveAvatarUrl } from '../core/utils/avatar.util';

@Component({
  selector: 'app-profile-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <details #wrapper class="profile-menu" (toggle)="onToggle($event)">
      <summary class="user-button" aria-haspopup="menu">
        <ng-container *ngIf="currentUser$ | async as user">
          <div class="user-meta">
            <span class="user-name">{{ getUserName(user) }}</span>
            <span class="user-role">{{ user.role }} Profile</span>
          </div>
          <span class="avatar" [style.background]="getAvatarColor(user.role)">
            <img *ngIf="user.avatar_url" [src]="avatarSrc(user.avatar_url)" alt="" />
            <span *ngIf="!user.avatar_url">{{ getInitials(getUserName(user)) }}</span>
          </span>
        </ng-container>
        <svg class="chevron" viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div class="dropdown-card" role="menu">
        <ng-container *ngIf="currentUser$ | async as user">
          <div class="dd-header">
            <span class="dd-avatar" [style.background]="getAvatarColor(user.role)">
              <img *ngIf="user.avatar_url" [src]="avatarSrc(user.avatar_url)" alt="" />
              <span *ngIf="!user.avatar_url">{{ getInitials(getUserName(user)) }}</span>
            </span>
            <div class="dd-meta">
              <strong>{{ getUserName(user) }}</strong>
              <span>{{ user.email || '' }}</span>
            </div>
          </div>
          <div class="dd-divider"></div>
        </ng-container>
        <button type="button" class="dd-item" role="menuitem" (click)="goToProfile()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>Employee Profile</span>
        </button>
        <button type="button" class="dd-logout" role="menuitem" (click)="logout()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/>
            <path d="M10 17l-5-5 5-5"/>
            <path d="M15 12H5"/>
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </details>
  `,
  styles: [`
    :host {
      display: inline-flex;
      position: relative;
    }

    .profile-menu {
      position: relative;
    }

    .profile-menu summary {
      list-style: none;
      cursor: pointer;
    }

    .profile-menu summary::-webkit-details-marker {
      display: none;
    }

    .user-button {
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 260px;
      height: 44px;
      padding: 4px 8px 4px 12px;
      border-radius: 12px;
      background: transparent;
    }

    .user-button:hover {
      background: #F3F4F6;
    }

    .avatar {
      display: grid;
      flex: 0 0 36px;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 999px;
      color: #FFFFFF;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0;
      text-transform: uppercase;
      overflow: hidden;
    }

    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .user-meta {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 1px;
      min-width: 0;
    }

    .user-name {
      overflow: hidden;
      color: #111827;
      font-size: 13px;
      font-weight: 600;
      line-height: 1.2;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-role {
      overflow: hidden;
      color: #9CA3AF;
      font-size: 11px;
      font-weight: 500;
      line-height: 1.2;
      text-overflow: ellipsis;
      text-transform: capitalize;
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
      z-index: 99999;
      width: 280px;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      background: #FFFFFF;
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.14);
    }

    .dd-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 16px 14px;
    }

    .dd-avatar {
      display: grid;
      flex: 0 0 44px;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: 999px;
      color: #FFFFFF;
      font-size: 14px;
      font-weight: 700;
      overflow: hidden;
    }

    .dd-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .dd-meta {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .dd-meta strong {
      color: #111827;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dd-meta span {
      color: #6B7280;
      font-size: 12px;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .dd-divider {
      height: 1px;
      margin: 0 16px 4px;
      background: #E5E7EB;
    }

    .dd-item,
    .dd-logout {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 12px;
      min-height: 44px;
      padding: 0 16px;
      border: 0;
      background: transparent;
      color: #374151;
      font-size: 13px;
      font-weight: 500;
      line-height: 1;
      text-align: left;
      cursor: pointer;
      font-family: inherit;
    }

    .dd-item:hover,
    .dd-logout:hover {
      background: #F9FAFB;
      color: #111827;
    }

    .dd-item svg,
    .dd-logout svg {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    @media (max-width: 720px) {
      .user-meta {
        display: none;
      }
    }
  `],
})
export class ProfileMenuComponent implements OnInit {
  @ViewChild('wrapper') wrapper?: ElementRef<HTMLDetailsElement>;

  currentUser$!: Observable<any>;

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.currentUser$ = this.authService.currentUser$;
  }

  getUserName(user: any): string {
    return user?.name || user?.full_name || 'User';
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

  logout(): void {
    this.close();
    this.authService.logout();
  }

  goToProfile(): void {
    this.close();
    this.router.navigate(['/employees/me']);
  }

  avatarSrc(url: string | undefined): string {
    return resolveAvatarUrl(url);
  }

  onToggle(_event: Event): void {
    /* native <details> handles open/close */
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    const wrapper = this.wrapper?.nativeElement;
    if (!wrapper || !wrapper.open) {
      return;
    }
    const target = event.target as HTMLElement | null;
    if (target && !wrapper.contains(target)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }

  private close(): void {
    if (this.wrapper?.nativeElement) {
      this.wrapper.nativeElement.open = false;
    }
  }
}
