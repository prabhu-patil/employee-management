import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, OnInit, Output, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { ProfileMenuComponent } from './profile-menu.component';

interface SearchEntry {
  title: string;
  section: string;
  route: string;
  icon: string;
  keywords: string[];
}

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, ProfileMenuComponent],
  template: `
    <header class="topbar">
      <div class="topbar-left">
        <button class="hamburger-button" type="button" aria-label="Open navigation" (click)="menuToggle.emit()">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>

        <div class="search-shell" [class.has-results]="showDropdown()">
          <label class="search-bar">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7"/>
              <path d="m20 20-3.5-3.5"/>
            </svg>
            <input
              type="search"
              placeholder="Search pages, attendance, holidays…"
              aria-label="Search"
              [ngModel]="query()"
              (ngModelChange)="onQueryChange($event)"
              (focus)="focused.set(true)"
              (keydown)="onKeydown($event)"
            />
            <button *ngIf="query()" type="button" class="clear-btn" aria-label="Clear" (click)="clear()">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
            </button>
          </label>

          <div *ngIf="showDropdown()" class="search-results" role="listbox">
            <div *ngIf="results().length === 0" class="empty-state">
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <span>No matches for "{{ query() }}"</span>
            </div>

            <ng-container *ngIf="results().length > 0">
              <div class="results-header">{{ results().length }} result(s)</div>
              <button
                *ngFor="let entry of results(); let i = index"
                type="button"
                class="result-row"
                [class.active]="activeIndex() === i"
                (mouseenter)="activeIndex.set(i)"
                (click)="select(entry)"
              >
                <span class="result-icon" [innerHTML]="getIcon(entry.icon)"></span>
                <div class="result-text">
                  <strong [innerHTML]="highlight(entry.title)"></strong>
                  <span>{{ entry.section }}</span>
                </div>
                <svg class="result-arrow" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6"/></svg>
              </button>
            </ng-container>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <button class="notification-button" type="button" aria-label="Notifications">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
          </svg>
          <span *ngIf="unreadCount > 0" class="unread-dot"></span>
        </button>

        <app-profile-menu></app-profile-menu>
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
      height: 70px;
      margin: 12px 12px 0;
      padding: 0 18px;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04), 0 6px 16px rgba(15, 23, 42, 0.04);
    }

    .topbar-left,
    .topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .hamburger-button {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #475569;
      cursor: pointer;
    }

    .hamburger-button:hover {
      background: #F1F5F9;
      color: #0F172A;
    }

    .hamburger-button svg {
      width: 20px;
      height: 20px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    /* Search shell */
    .search-shell {
      position: relative;
      width: 360px;
      max-width: 50vw;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 38px;
      padding: 0 14px;
      border-radius: 999px;
      background: #F3F4F6;
      transition: background-color 160ms ease, box-shadow 160ms ease;
    }

    .search-shell.has-results .search-bar,
    .search-bar:focus-within {
      background: #FFFFFF;
      box-shadow: 0 0 0 1px #BFDBFE, 0 0 0 4px rgb(37 99 235 / 0.12);
    }

    .search-bar > svg {
      width: 16px;
      height: 16px;
      flex: 0 0 16px;
      fill: none;
      stroke: #9CA3AF;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .search-bar input {
      flex: 1;
      min-width: 0;
      border: 0;
      background: transparent;
      font-size: 13px;
      color: #111827;
      outline: none;
    }

    .search-bar input::placeholder {
      color: #9CA3AF;
    }

    .clear-btn {
      display: grid;
      place-items: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.06);
      color: #475569;
      cursor: pointer;
    }

    .clear-btn:hover {
      background: rgba(15, 23, 42, 0.12);
      color: #0F172A;
    }

    .clear-btn svg {
      width: 12px;
      height: 12px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    /* Results dropdown */
    .search-results {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      max-height: 360px;
      overflow-y: auto;
      padding: 6px;
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.15);
      z-index: 60;
    }

    .empty-state {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 16px 12px;
      color: #94A3B8;
      font-size: 13px;
    }

    .empty-state svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .results-header {
      padding: 8px 12px 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #94A3B8;
    }

    .result-row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 10px 12px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #1E293B;
      font-family: inherit;
      cursor: pointer;
      text-align: left;
      transition: background-color 160ms ease;
    }

    .result-row.active,
    .result-row:hover {
      background: #EEF2FF;
    }

    .result-icon {
      display: grid;
      place-items: center;
      flex: 0 0 32px;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: #F1F5F9;
      color: #475569;
    }

    .result-row.active .result-icon,
    .result-row:hover .result-icon {
      background: #DBEAFE;
      color: #1D4ED8;
    }

    .result-icon svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.8;
    }

    .result-text {
      flex: 1;
      min-width: 0;
    }

    .result-text strong {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #0F172A;
    }

    .result-text strong .hl {
      background: #FEF08A;
      color: #713F12;
      padding: 0 1px;
      border-radius: 2px;
    }

    .result-text span {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      color: #94A3B8;
    }

    .result-arrow {
      width: 14px;
      height: 14px;
      flex: 0 0 14px;
      fill: none;
      stroke: #CBD5E1;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    /* Right side */
    .notification-button {
      position: relative;
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: #F3F4F6;
      color: #475569;
      cursor: pointer;
    }

    .notification-button:hover {
      background: #E5E7EB;
      color: #111827;
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

    @media (max-width: 720px) {
      .topbar {
        padding-inline: 12px;
      }

      .search-shell {
        width: 220px;
      }

      .topbar-right {
        gap: 6px;
      }
    }
  `]
})
export class TopbarComponent implements OnInit {
  @Output() menuToggle = new EventEmitter<void>();

  unreadCount = 0;

  readonly query = signal<string>('');
  readonly focused = signal<boolean>(false);
  readonly activeIndex = signal<number>(0);

  private readonly index: SearchEntry[] = [
    { title: 'HR Dashboard', section: 'Dashboard', route: '/dashboard', icon: 'dashboard', keywords: ['hr', 'overview', 'analytics', 'kpi'] },
    { title: 'Employee Dashboard', section: 'Dashboard', route: '/dashboard/employee', icon: 'dashboard', keywords: ['employee', 'tickets', 'projects', 'tasks'] },
    { title: 'Employees', section: 'Workforce', route: '/employees', icon: 'employees', keywords: ['people', 'staff', 'team', 'directory', 'members'] },
    { title: 'Projects', section: 'Projects', route: '/projects', icon: 'projects', keywords: ['kanban', 'tasks', 'running', 'board', 'erp'] },
    { title: 'Admin Attendance', section: 'Attendance', route: '/attendance', icon: 'attendance', keywords: ['admin', 'check-in', 'checkout', 'logs', 'history'] },
    { title: 'Employee Attendance', section: 'Attendance', route: '/attendance/employee', icon: 'attendance', keywords: ['employee', 'log', 'analytics', 'punctuality'] },
    { title: 'Leave Management', section: 'Leave', route: '/leave', icon: 'leave', keywords: ['leaves', 'absence', 'time off', 'requests', 'pto'] },
    { title: 'All Holidays', section: 'Holidays', route: '/holidays', icon: 'holidays', keywords: ['list', 'calendar', 'national', 'religious', 'cultural'] },
    { title: 'Add Holiday', section: 'Holidays', route: '/holidays/add-holiday', icon: 'holidays', keywords: ['new', 'create', 'form'] },
    { title: 'Edit Holiday', section: 'Holidays', route: '/holidays/edit-holiday', icon: 'holidays', keywords: ['update', 'modify', 'change'] },
  ];

  readonly results = computed<SearchEntry[]>(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return [];
    const scored = this.index
      .map((entry) => ({ entry, score: this.scoreEntry(entry, q) }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.map((s) => s.entry).slice(0, 8);
  });

  readonly showDropdown = computed(() => this.focused() && this.query().trim().length > 0);

  constructor(private router: Router, private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => (event as NavigationEnd).url),
    ).subscribe(() => {
      this.clear();
    });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(ev: MouseEvent): void {
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.focused.set(false);
    }
  }

  onQueryChange(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
    this.focused.set(true);
  }

  onKeydown(ev: KeyboardEvent): void {
    const list = this.results();
    if (ev.key === 'ArrowDown') {
      ev.preventDefault();
      this.activeIndex.set(Math.min(list.length - 1, this.activeIndex() + 1));
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.activeIndex.set(Math.max(0, this.activeIndex() - 1));
    } else if (ev.key === 'Enter') {
      const entry = list[this.activeIndex()];
      if (entry) {
        ev.preventDefault();
        this.select(entry);
      }
    } else if (ev.key === 'Escape') {
      this.clear();
    }
  }

  select(entry: SearchEntry): void {
    this.router.navigate([entry.route]);
    this.clear();
  }

  clear(): void {
    this.query.set('');
    this.focused.set(false);
    this.activeIndex.set(0);
  }

  highlight(text: string): string {
    const q = this.query().trim();
    if (!q) return this.escapeHtml(text);
    const safeText = this.escapeHtml(text);
    const safeQuery = this.escapeRegex(this.escapeHtml(q));
    return safeText.replace(new RegExp(`(${safeQuery})`, 'ig'), '<span class="hl">$1</span>');
  }

  getIcon(name: string): string {
    const icons: Record<string, string> = {
      dashboard: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/></svg>',
      employees: '<svg viewBox="0 0 24 24"><path d="M16 19c0-2.2-1.8-4-4-4H7c-2.2 0-4 1.8-4 4"/><circle cx="9.5" cy="8" r="3.5"/><path d="M21 19c0-1.9-1.3-3.5-3.1-3.9"/><path d="M16 4.3a3.5 3.5 0 0 1 0 6.4"/></svg>',
      projects: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/></svg>',
      attendance: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
      leave: '<svg viewBox="0 0 24 24"><path d="M7 3v4M17 3v4M4 9h16"/><rect x="4" y="5" width="16" height="16" rx="2"/></svg>',
      holidays: '<svg viewBox="0 0 24 24"><path d="M12 2v4M5 5l3 3M19 5l-3 3M3 12h4M17 12h4M12 18v4"/><circle cx="12" cy="12" r="4"/></svg>',
    };
    return icons[name] || icons['dashboard'];
  }

  private scoreEntry(entry: SearchEntry, q: string): number {
    const title = entry.title.toLowerCase();
    const section = entry.section.toLowerCase();
    let score = 0;
    if (title === q) score += 100;
    if (title.startsWith(q)) score += 60;
    if (title.includes(q)) score += 30;
    if (section.includes(q)) score += 12;
    for (const k of entry.keywords) {
      const kl = k.toLowerCase();
      if (kl.startsWith(q)) score += 18;
      else if (kl.includes(q)) score += 8;
    }
    return score;
  }

  private escapeHtml(s: string): string {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
  }

  private escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
