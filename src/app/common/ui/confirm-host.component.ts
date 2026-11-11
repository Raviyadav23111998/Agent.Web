import { Component } from '@angular/core';
import { ConfirmService } from './confirm.service';

/**
 * Renders the single global confirm dialog driven by ConfirmService. Place
 * once in the admin shell.
 */
@Component({
  selector: 'app-confirm-host',
  standalone: false,
  template: `
    <app-confirm-dialog
      *ngIf="(confirm.state$ | async) as s"
      [isOpen]="s.isOpen"
      [title]="s.title || ''"
      [message]="s.message || ''"
      [confirmText]="s.confirmText || 'Confirm'"
      [cancelText]="s.cancelText || 'Cancel'"
      [variant]="s.variant || 'default'"
      [icon]="s.icon || ''"
      (confirmed)="confirm.resolve(true)"
      (cancelled)="confirm.resolve(false)">
    </app-confirm-dialog>
  `,
})
export class ConfirmHostComponent {
  constructor(public confirm: ConfirmService) {}
}
