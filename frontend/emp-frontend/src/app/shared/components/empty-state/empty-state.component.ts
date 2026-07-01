import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type TablerIconName = 'calendar' | 'clipboard-list' | 'inbox' | 'search' | 'users' | string;

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="empty-state" role="status">
      <span class="icon-wrap" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path *ngFor="let path of iconPaths" [attr.d]="path"></path>
        </svg>
      </span>
      <h2>{{ title }}</h2>
      <p>{{ description }}</p>
      <button *ngIf="actionLabel" type="button" (click)="actionClick.emit()">
        {{ actionLabel }}
      </button>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .empty-state {
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
      min-height: 180px;
      padding: 28px 18px;
      text-align: center;
    }

    .icon-wrap {
      display: grid;
      place-items: center;
      width: 64px;
      height: 64px;
      border-radius: 999px;
      background: #EFF6FF;
      color: #2563EB;
    }

    svg {
      width: 48px;
      height: 48px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 1.6;
    }

    h2 {
      margin: 16px 0 0;
      color: #111827;
      font-size: 16px;
      font-weight: 500;
      line-height: 1.25;
    }

    p {
      max-width: 340px;
      margin: 8px 0 0;
      color: #6B7280;
      font-size: 14px;
      line-height: 1.5;
    }

    button {
      min-height: 36px;
      margin-top: 18px;
      border: 0;
      border-radius: 10px;
      background: #2563EB;
      color: #FFFFFF;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      padding: 0 14px;
    }

    button:hover {
      background: #1D4ED8;
    }
  `],
})
export class EmptyStateComponent {
  @Input() icon: TablerIconName = 'inbox';
  @Input() title = '';
  @Input() description = '';
  @Input() actionLabel?: string;
  @Output() actionClick = new EventEmitter<void>();

  private readonly icons: Record<string, string[]> = {
    calendar: [
      'M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2z',
      'M16 3v4',
      'M8 3v4',
      'M4 11h16',
    ],
    'clipboard-list': [
      'M9 5h6',
      'M9 3h6a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2H6a2 2 0 0 1 -2 -2V8a2 2 0 0 1 2 -2h1V5a2 2 0 0 1 2 -2z',
      'M9 12h.01',
      'M13 12h2',
      'M9 16h.01',
      'M13 16h2',
    ],
    inbox: [
      'M4 4h16l-2 10H6z',
      'M4 14l2 5h12l2 -5',
      'M10 14a2 2 0 0 0 4 0',
    ],
    search: [
      'M10 18a8 8 0 1 0 0 -16a8 8 0 0 0 0 16z',
      'M21 21l-5.2 -5.2',
    ],
    users: [
      'M9 7a4 4 0 1 0 0 8a4 4 0 0 0 0 -8z',
      'M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2',
      'M16 3.13a4 4 0 0 1 0 7.75',
      'M21 21v-2a4 4 0 0 0 -3 -3.85',
    ],
  };

  get iconPaths(): string[] {
    return this.icons[this.icon] ?? this.icons['inbox'];
  }
}
