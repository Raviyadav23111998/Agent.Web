import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="confirm-overlay" *ngIf="isOpen" (click)="onCancel()">
      <div class="confirm-dialog" (click)="$event.stopPropagation()" [ngClass]="variant">
        <div class="confirm-icon" *ngIf="icon">{{ icon }}</div>
        <h5 class="confirm-title">{{ title }}</h5>
        <p class="confirm-message">{{ message }}</p>
        <div class="confirm-actions">
          <button class="btn btn-secondary" (click)="onCancel()">{{ cancelText }}</button>
          <button class="btn" [ngClass]="confirmBtnClass" (click)="onConfirm()" [disabled]="isLoading">
            {{ isLoading ? 'Processing...' : confirmText }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confirm-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fadeIn 0.15s ease;
    }

    .confirm-dialog {
      background: var(--kendo-color-app-surface);
      border: 1px solid var(--kendo-color-border);
      border-radius: 16px;
      padding: 32px;
      min-width: 360px;
      max-width: 440px;
      text-align: center;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
      animation: scaleIn 0.2s ease;
    }

    .confirm-icon {
      font-size: 2.5rem;
      margin-bottom: 12px;
    }

    .confirm-title {
      font-weight: 700;
      margin-bottom: 8px;
      color: var(--kendo-color-on-app-surface);
    }

    .confirm-message {
      font-size: 0.88rem;
      color: var(--kendo-color-subtle);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    .confirm-actions {
      display: flex;
      gap: 10px;
      justify-content: center;
    }

    .confirm-actions .btn {
      min-width: 100px;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes scaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `],
  standalone: false
})
export class ConfirmDialogComponent {
  @Input() isOpen = false;
  @Input() title = 'Confirm Action';
  @Input() message = 'Are you sure you want to proceed?';
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() variant: 'danger' | 'warning' | 'default' = 'default';
  @Input() icon = '';
  @Input() isLoading = false;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  get confirmBtnClass(): string {
    switch (this.variant) {
      case 'danger': return 'btn-danger';
      case 'warning': return 'btn-warning';
      default: return 'btn-primary';
    }
  }

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
