import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'default';
  icon?: string;
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  _resolve?: (v: boolean) => void;
}

/**
 * Imperative confirmation dialog — replaces native window.confirm() with the
 * styled ConfirmDialogComponent, everywhere, consistently. Usage:
 *
 *   if (await this.confirm.ask({ title: 'Delete job?', variant: 'danger',
 *                                confirmText: 'Delete' })) { ... }
 *
 * A single <app-confirm-host> in the admin shell renders the dialog.
 */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly state$ = new BehaviorSubject<ConfirmState>({ isOpen: false });

  ask(opts: ConfirmOptions = {}): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.state$.next({
        isOpen: true,
        title: opts.title ?? 'Are you sure?',
        message: opts.message ?? 'This action cannot be undone.',
        confirmText: opts.confirmText ?? 'Confirm',
        cancelText: opts.cancelText ?? 'Cancel',
        variant: opts.variant ?? 'default',
        icon: opts.icon ?? (opts.variant === 'danger' ? '🗑️' : ''),
        _resolve: resolve,
      });
    });
  }

  resolve(result: boolean): void {
    const s = this.state$.value;
    s._resolve?.(result);
    this.state$.next({ isOpen: false });
  }
}
