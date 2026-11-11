import { Component, Input } from '@angular/core';

/**
 * Consistent empty / no-data state for admin lists and panels.
 * Usage:
 *   <app-empty-state icon="⏰" title="No cron jobs yet"
 *                    subtitle="Schedule a job to run the agent automatically.">
 *     <button ...>New job</button>   <!-- optional projected action -->
 *   </app-empty-state>
 */
@Component({
  selector: 'app-empty-state',
  standalone: false,
  template: `
    <div class="empty-state" role="status">
      <div class="empty-icon" *ngIf="icon">{{ icon }}</div>
      <h4 class="empty-title">{{ title }}</h4>
      <p class="empty-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      <div class="empty-action"><ng-content></ng-content></div>
    </div>
  `,
  // Values mirror _shared-admin.scss .empty-state exactly (padding 60px 20px,
  // icon 3rem, title 1.125rem/on-app-surface = h5, subtitle 0.88rem) so it is
  // visually identical to the class-based empty states already in use.
  styles: [`
    .empty-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; text-align: center;
      padding: 60px 20px; color: var(--kendo-color-subtle);
    }
    .empty-icon { font-size: 3rem; margin-bottom: 16px; }
    .empty-title {
      margin: 0 0 8px; font-size: 1.125rem; font-weight: 700;
      color: var(--kendo-color-on-app-surface);
    }
    .empty-subtitle {
      margin: 0; max-width: 420px; font-size: 0.88rem; line-height: 1.5;
    }
    .empty-action { margin-top: 16px; }
    .empty-action:empty { display: none; }
  `],
})
export class EmptyStateComponent {
  @Input() icon = '';
  @Input() title = 'Nothing here yet';
  @Input() subtitle = '';
}
