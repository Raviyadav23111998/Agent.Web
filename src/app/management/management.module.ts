import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ManagementRoutingModule } from './management-routing.module';

import { UserListComponent } from './user/user-list.component';
import { UserComponent } from './user/user.component';

@NgModule({
  declarations: [
    UserListComponent,
    UserComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    ManagementRoutingModule,
  ]
})
export class ManagementModule { }
