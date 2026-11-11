import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ChatLayoutComponent } from './layout/chat-layout.component';
import { ChatViewComponent } from './view/chat-view.component';

const routes: Routes = [
  {
    path: '',
    component: ChatLayoutComponent,
    children: [

      { path: 'settings/integrations', redirectTo: '/admin/credentials', pathMatch: 'full' },
      { path: 'settings/credentials/admin', redirectTo: '/admin/credentials/console', pathMatch: 'full' },
      { path: 'settings/knowledge', redirectTo: '/admin/knowledge', pathMatch: 'full' },
      { path: 'settings/bots', redirectTo: '/admin/bots', pathMatch: 'full' },
      { path: 'settings/crons', redirectTo: '/admin/crons', pathMatch: 'full' },
      { path: 'settings/applications', redirectTo: '/admin/applications', pathMatch: 'full' },
      { path: 'settings/llm', redirectTo: '/admin/llm', pathMatch: 'full' },
      { path: 'settings/system-config', redirectTo: '/admin/connections', pathMatch: 'full' },
      { path: 'settings/users', redirectTo: '/admin/users', pathMatch: 'full' },

      { path: '', component: ChatViewComponent },
      { path: ':conversationId', component: ChatViewComponent }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ChatRoutingModule {}
