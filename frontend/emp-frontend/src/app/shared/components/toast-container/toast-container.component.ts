import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ViewChild, inject } from '@angular/core';
import { CdkPortal, PortalModule, TemplatePortal } from '@angular/cdk/portal';
import {
  animate,
  style,
  transition,
  trigger,
} from '@angular/animations';

import { Toast, ToastService, ToastType } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, PortalModule],
  animations: [
    trigger('toastSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(24px)' }),
        animate('220ms cubic-bezier(0.4,0,0.2,1)', style({ opacity: 1, transform: 'translateX(0)' })),
      ]),
      transition(':leave', [
        animate('160ms ease-in', style({ opacity: 0, transform: 'translateX(24px)' })),
      ]),
    ]),
  ],
  template: `
    <ng-template cdkPortal>
      <section class="toast-stack" aria-live="polite" aria-atomic="false">
        <article
          *ngFor="let toast of toasts$ | async; trackBy: trackById"
          class="toast"
          [ngClass]="toast.type"
          @toastSlide
        >
          <span class="toast-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path *ngFor="let path of iconPaths(toast.type)" [attr.d]="path"></path>
            </svg>
          </span>

          <div class="toast-copy">
            <h2>{{ toast.title }}</h2>
            <p>{{ toast.message }}</p>
          </div>

          <button type="button" aria-label="Dismiss notification" (click)="dismiss(toast.id)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18"></path>
            </svg>
          </button>
        </article>
      </section>
    </ng-template>

    <ng-template [cdkPortalOutlet]="portal"></ng-template>
  `,
  styles: [`
    :host {
      display: contents;
    }

    .toast-stack {
      position: fixed;
      top: 18px;
      right: 18px;
      z-index: 1200;
      display: grid;
      width: min(380px, calc(100vw - 32px));
      gap: 10px;
      pointer-events: none;
    }

    .toast {
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) 28px;
      gap: 10px;
      align-items: start;
      overflow: hidden;
      border: 1px solid #E5E7EB;
      border-left-width: 4px;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 14px 34px rgba(15, 23, 42, 0.14);
      padding: 12px;
      pointer-events: auto;
    }

    .toast.success {
      border-left-color: #16A34A;
    }

    .toast.error {
      border-left-color: #DC2626;
    }

    .toast.warning {
      border-left-color: #D97706;
    }

    .toast.info {
      border-left-color: #2563EB;
    }

    .toast-icon {
      display: grid;
      place-items: center;
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #EFF6FF;
      color: #2563EB;
    }

    .toast.success .toast-icon {
      background: #DCFCE7;
      color: #16A34A;
    }

    .toast.error .toast-icon {
      background: #FEE2E2;
      color: #DC2626;
    }

    .toast.warning .toast-icon {
      background: #FEF3C7;
      color: #D97706;
    }

    .toast-copy {
      min-width: 0;
    }

    h2,
    p {
      margin: 0;
    }

    h2 {
      color: #111827;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
    }

    p {
      margin-top: 4px;
      color: #6B7280;
      font-size: 12px;
      line-height: 1.4;
    }

    svg {
      width: 18px;
      height: 18px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    button {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: #9CA3AF;
      cursor: pointer;
      padding: 0;
    }

    button:hover {
      background: #F3F4F6;
      color: #374151;
    }
  `],
})
export class ToastContainerComponent implements AfterViewInit {
  @ViewChild(CdkPortal) private readonly toastPortal?: CdkPortal;

  private readonly toastService = inject(ToastService);

  portal?: TemplatePortal;
  readonly toasts$ = this.toastService.toasts$;

  private readonly icons: Record<ToastType, string[]> = {
    success: ['M5 12l5 5L20 7'],
    error: ['M18 6 6 18', 'M6 6l12 12'],
    warning: ['M12 9v4', 'M12 17h.01', 'M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7 -3L13.7 4.3a2 2 0 0 0 -3.4 0z'],
    info: ['M12 8h.01', 'M11 12h1v4h1', 'M12 21a9 9 0 1 0 0 -18a9 9 0 0 0 0 18z'],
  };

  ngAfterViewInit(): void {
    this.portal = this.toastPortal;
  }

  trackById(_index: number, toast: Toast): number {
    return toast.id;
  }

  dismiss(id: number): void {
    this.toastService.remove(id);
  }

  iconPaths(type: ToastType): string[] {
    return this.icons[type];
  }
}
