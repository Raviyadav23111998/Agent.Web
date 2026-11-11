import { Component, Input } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-typing-indicator',
  template: `
    <div class="typing-indicator" *ngIf="visible">
      <div class="indicator-avatar">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z"/>
          <path d="M2 17l10 5 10-5"/>
          <path d="M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="indicator-body">
        <div class="dots">
          <span class="dot"></span>
          <span class="dot"></span>
          <span class="dot"></span>
        </div>
        <span class="status-text" *ngIf="status">{{ statusLabel }}</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .typing-indicator {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      max-width: 800px;
      margin: 0 auto;
      padding: 0 1.5rem;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .indicator-avatar {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: var(--kendo-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      flex-shrink: 0;
    }

    .indicator-body {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      background: rgba(255,255,255,0.03);
      border-radius: 16px;
    }

    .dots {
      display: flex;
      gap: 4px;
    }

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--kendo-color-primary);
      animation: bounce 1.4s ease-in-out infinite both;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.16s; }
      &:nth-child(3) { animation-delay: 0.32s; }
    }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }

    .status-text {
      font-size: 0.8rem;
      color: rgba(255,255,255,0.45);
      white-space: nowrap;
    }
  `]
})
export class TypingIndicatorComponent {
  @Input() visible = false;
  @Input() status = '';

  get statusLabel(): string {
    switch (this.status) {
      case 'connecting': return 'Connecting...';
      case 'loading_context': return 'Loading context...';
      case 'reasoning': return 'Thinking...';
      case 'started': return '';
      default:
        if (this.status?.startsWith('Running:')) return this.status;
        return 'Processing...';
    }
  }
}
