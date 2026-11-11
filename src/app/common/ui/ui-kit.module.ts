import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfirmDialogComponent } from '../components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from './empty-state.component';
import { SkeletonComponent } from './skeleton.component';
import { PageHeaderComponent } from './page-header.component';
import { ConfirmHostComponent } from './confirm-host.component';
import { FormDialogHostComponent } from './form-dialog-host.component';

/**
 * Shared admin UI primitives, built on the existing --kendo-* / --shadow-*
 * design tokens. Import into any feature module to get consistent page
 * headers, empty states, loading skeletons, and the global confirm dialog.
 */
@NgModule({
  declarations: [
    ConfirmDialogComponent,
    ConfirmHostComponent,
    FormDialogHostComponent,
    EmptyStateComponent,
    SkeletonComponent,
    PageHeaderComponent,
  ],
  imports: [CommonModule],
  exports: [
    ConfirmDialogComponent,
    ConfirmHostComponent,
    FormDialogHostComponent,
    EmptyStateComponent,
    SkeletonComponent,
    PageHeaderComponent,
  ],
})
export class UiKitModule {}
