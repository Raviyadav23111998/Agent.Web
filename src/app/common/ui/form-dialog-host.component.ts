import { Component, ViewEncapsulation } from '@angular/core';
import { FormDialogService } from './form-dialog.service';

/**
 * Renders the single global form dialog driven by FormDialogService.
 * Place once in the admin shell (next to <app-confirm-host>).
 *
 * ViewEncapsulation.None is used so that the projected ng-template content
 * (which comes from other components) inherits its original component styles
 * for form-grid, form-select, modal-actions, etc.
 */
@Component({
  selector: 'app-form-dialog-host',
  standalone: false,
  encapsulation: ViewEncapsulation.None,
  template: `
    <ng-container *ngIf="(dialog.state$ | async) as s">
      <div class="form-dialog-overlay" *ngIf="s.isOpen" (click)="dialog.close()">
        <div class="form-dialog" (click)="$event.stopPropagation()">
          <div class="form-dialog-header">
            <h3>{{ s.title }}</h3>
            <button class="form-dialog-close" (click)="dialog.close()">✕</button>
          </div>
          <div class="form-dialog-body">
            <ng-container *ngTemplateOutlet="s.template; context: s.context"></ng-container>
          </div>
        </div>
      </div>
    </ng-container>
  `,
  styles: [`
    .form-dialog-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 1100;
      display: flex;
      align-items: center;
      justify-content: center;
      animation: fdFadeIn 0.15s ease;
    }

    .form-dialog {
      background: var(--kendo-color-app-surface);
      border: 1px solid var(--kendo-color-border);
      border-radius: 16px;
      width: min(680px, 94vw);
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
      animation: fdScaleIn 0.2s ease;
    }

    .form-dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 22px 28px 0;
    }

    .form-dialog-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--kendo-color-on-app-surface);
    }

    .form-dialog-close {
      background: none;
      border: none;
      font-size: 1.1rem;
      cursor: pointer;
      color: var(--kendo-color-subtle);
      padding: 4px 8px;
      border-radius: 6px;
      transition: background 0.15s ease;
    }
    .form-dialog-close:hover {
      background: var(--kendo-color-base-subtle);
    }

    .form-dialog-body {
      padding: 20px 28px 26px;
    }

    /* ── Form styles for projected content ─────────────────────────── */
    .form-dialog-body .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px 18px;
    }

    .form-dialog-body .form-grid label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--kendo-color-subtle);
    }

    .form-dialog-body .form-grid .span-2 {
      grid-column: span 2;
    }

    .form-dialog-body .form-select,
    .form-dialog-body input {
      padding: 7px 10px;
      border: 1px solid var(--kendo-color-border);
      border-radius: 8px;
      background: var(--kendo-color-app-surface);
      color: inherit;
      font-size: 0.85rem;
    }

    .form-dialog-body .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 22px;
    }

    @keyframes fdFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes fdScaleIn {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
  `],
})
export class FormDialogHostComponent {
  constructor(public dialog: FormDialogService) {}
}
