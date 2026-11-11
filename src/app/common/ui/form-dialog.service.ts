import { Injectable, TemplateRef } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface FormDialogOptions {
  title?: string;
  template: TemplateRef<any>;
  context?: any;
}

interface FormDialogState {
  isOpen: boolean;
  title: string;
  template: TemplateRef<any> | null;
  context: any;
  _resolve?: (v: boolean) => void;
}

/**
 * Imperative form dialog — renders a caller-supplied <ng-template> inside a
 * portal-style overlay at the admin shell root (outside overflow:hidden containers).
 *
 * Usage in a component:
 *   @ViewChild('budgetTpl') budgetTpl!: TemplateRef<any>;
 *   this.formDialog.open({ title: 'New Budget', template: this.budgetTpl });
 *   // later: this.formDialog.close();
 *
 * A single <app-form-dialog-host> in the admin shell renders the overlay.
 */
@Injectable({ providedIn: 'root' })
export class FormDialogService {
  readonly state$ = new BehaviorSubject<FormDialogState>({
    isOpen: false, title: '', template: null, context: null,
  });

  open(opts: FormDialogOptions): void {
    this.state$.next({
      isOpen: true,
      title: opts.title ?? '',
      template: opts.template,
      context: opts.context ?? null,
    });
  }

  close(): void {
    const s = this.state$.value;
    s._resolve?.(false);
    this.state$.next({ isOpen: false, title: '', template: null, context: null });
  }
}
