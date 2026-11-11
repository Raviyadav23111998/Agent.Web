import { Component, Input } from '@angular/core';

/**
 * Shimmering placeholder shown while data loads. Visually mirrors
 * _shared-admin.scss (.skeleton-card / .skeleton-line) exactly, so pages that
 * use <app-skeleton> look identical to the class-based skeletons. Usage:
 *   <app-skeleton *ngIf="isLoading" [rows]="5"></app-skeleton>
 */
@Component({
  selector: 'app-skeleton',
  standalone: false,
  template: `
    <div class="sk-wrap" aria-hidden="true">
      <div class="sk-card" *ngFor="let r of rowArray">
        <div class="sk-line" [style.width]="w()"></div>
        <div class="sk-line" [style.width]="w2()"></div>
        <div class="sk-line" style="width:80%"></div>
      </div>
    </div>
  `,
  styles: [`
    .sk-wrap { display: flex; flex-direction: column; gap: 14px; }
    .sk-card {
      background: var(--kendo-color-app-surface);
      border: 1px solid var(--kendo-color-border);
      border-radius: 12px;
      padding: 24px;
    }
    .sk-line {
      height: 14px; border-radius: 6px; margin-bottom: 10px;
      background: linear-gradient(90deg,
        var(--kendo-color-base-subtle) 25%,
        var(--kendo-color-base-subtle-hover) 50%,
        var(--kendo-color-base-subtle) 75%);
      background-size: 200% 100%;
      animation: sk-shimmer 1.5s infinite;
    }
    .sk-line:last-child { margin-bottom: 0; }
    @keyframes sk-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `],
})
export class SkeletonComponent {
  @Input() rows = 4;
  get rowArray(): number[] { return Array.from({ length: Math.max(1, this.rows) }, (_, i) => i); }
  w(): string { return `${55 + (Math.floor(Math.random() * 30))}%`; }
  w2(): string { return `${25 + (Math.floor(Math.random() * 20))}%`; }
}
