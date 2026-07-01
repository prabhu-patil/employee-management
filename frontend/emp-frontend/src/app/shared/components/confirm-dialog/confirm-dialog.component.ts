import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="open" class="modal-backdrop" (click)="onCancel()">
      <div class="confirm-modal" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="confirm-icon" [class.warn]="danger">
          <svg *ngIf="danger" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 9v4"/><path d="M12 17h.01"/>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          </svg>
          <svg *ngIf="!danger" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9"/><path d="M12 8v4"/><path d="M12 16h.01"/>
          </svg>
        </div>
        <h3>{{ title }}</h3>
        <p [innerHTML]="message"></p>
        <div class="confirm-actions">
          <button type="button" class="btn-cancel" (click)="onCancel()">{{ cancelLabel }}</button>
          <button type="button" class="btn-confirm" [class.danger]="danger" (click)="onConfirm()">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: grid;
      place-items: center;
      padding: 16px;
      background: rgba(15, 23, 42, 0.45);
      backdrop-filter: blur(2px);
      animation: fadeIn 140ms ease;
    }

    .confirm-modal {
      width: min(100%, 380px);
      padding: 22px 22px 18px;
      background: #FFFFFF;
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
      text-align: center;
      animation: popIn 160ms ease;
    }

    .confirm-icon {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      margin: 0 auto 12px;
      border-radius: 999px;
      background: #DBEAFE;
      color: #1D4ED8;
    }

    .confirm-icon.warn {
      background: #FEE2E2;
      color: #DC2626;
    }

    .confirm-icon svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }

    h3 {
      margin: 0 0 6px;
      color: #0F172A;
      font-size: 17px;
      font-weight: 700;
    }

    p {
      margin: 0 0 18px;
      color: #475569;
      font-size: 13px;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .confirm-actions button {
      flex: 1;
      min-height: 38px;
      padding: 0 16px;
      border: 0;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 160ms ease, transform 120ms ease;
    }

    .btn-cancel {
      background: #F1F5F9;
      color: #475569;
    }
    .btn-cancel:hover { background: #E2E8F0; }

    .btn-confirm {
      background: #2563EB;
      color: #FFFFFF;
    }
    .btn-confirm:hover { background: #1D4ED8; }

    .btn-confirm.danger {
      background: #DC2626;
    }
    .btn-confirm.danger:hover { background: #B91C1C; }

    .confirm-actions button:active { transform: scale(0.97); }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes popIn { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
  `],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Are you sure?';
  @Input() message = 'This action cannot be undone.';
  @Input() confirmLabel = 'Delete';
  @Input() cancelLabel = 'Cancel';
  @Input() danger = true;

  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void { this.confirm.emit(); }
  onCancel(): void { this.cancel.emit(); }
}
