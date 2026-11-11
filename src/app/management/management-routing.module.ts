import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { UserListComponent } from './user/user-list.component';
import { UserComponent } from './user/user.component';

const routes: Routes = [
  { path: '', component: UserListComponent },
  { path: 'add-user/:id', component: UserComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ManagementRoutingModule { }
