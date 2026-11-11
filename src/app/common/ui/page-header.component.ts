import { Component, Input } from '@angular/core';

/**
 * Consistent page header for every admin section: title + subtitle on the
 * left, projected action buttons on the right. Usage:
 *   <app-page-header title="Cron Jobs" subtitle="Scheduled agent runs.">
 *     <button class="btn btn-primary">New job</button>
 *   </app-page-header>
 */
@Component({
  selector: 'app-page-header',
  standalone: false,
  template: `
    <header class="page-header">
      <div class="ph-text">
        <h1 class="ph-title">{{ title }}</h1>
        <p class="ph-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="ph-actions"><ng-content></ng-content></div>
    </header>
  `,
  // Values mirror _shared-admin.scss .page-header exactly (h4 = 1.25rem/700,
  // subtitle 0.85rem, margin-bottom 28px, no divider) so component-based
  // pages (crons/llm/connections/audit) are visually identical to the
  // class-based ones (memory/conversations/agents/…). One admin language.
  styles: [`
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; flex-wrap: wrap; margin-bottom: 28px;
    }
    .ph-title {
      margin: 0 0 4px; font-size: 1.25rem; font-weight: 700;
      color: var(--kendo-color-on-app-surface);
    }
    .ph-subtitle {
      margin: 0; font-size: 0.85rem; line-height: 1.4;
      color: var(--kendo-color-subtle);
    }
    .ph-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .ph-actions:empty { display: none; }
  `],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle = '';
}
