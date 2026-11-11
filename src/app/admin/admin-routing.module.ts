import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';

import { ApplicationsComponent } from '../chat/settings/applications/applications.component';
import { BotsComponent } from '../chat/settings/bots/bots.component';
import { EmbedIntegrationsComponent } from './embed-integrations/embed-integrations.component';
import { CronsComponent } from '../chat/settings/crons/crons.component';
import { LlmSettingsComponent } from '../chat/settings/llm-settings/llm-settings.component';
import { KnowledgeComponent } from '../chat/settings/knowledge/knowledge.component';
import { ConnectionsComponent } from './connections/connections.component';
import { ApiIntegrationsComponent } from './api-integrations/api-integrations.component';
import { ChannelsComponent } from './channels/channels.component';
import { BrandingComponent } from './branding/branding.component';

import { LlmProfilesComponent } from './llm-profiles/llm-profiles.component';
import { SkillsComponent } from './skills/skills.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AgentsComponent } from './agents/agents.component';
import { MemoryBrowserComponent } from './memory-browser/memory-browser.component';
import { ConversationsComponent } from './conversations/conversations.component';
import { AuditComponent } from './audit/audit.component';

const routes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    children: [

      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

      { path: 'dashboard', component: DashboardComponent },

      { path: 'applications', component: ApplicationsComponent },
      { path: 'integrations', component: EmbedIntegrationsComponent },
      { path: 'bots', redirectTo: 'integrations', pathMatch: 'full' },  // back-compat
      { path: 'channels', component: ChannelsComponent },
      { path: 'branding', component: BrandingComponent },
      { path: 'crons', component: CronsComponent },
      { path: 'agents', component: AgentsComponent },

      { path: 'knowledge', component: KnowledgeComponent },
      { path: 'llm', component: LlmSettingsComponent },
      { path: 'llm-profiles', component: LlmProfilesComponent },
      { path: 'skills', component: SkillsComponent },
      { path: 'memory', component: MemoryBrowserComponent },
      { path: 'conversations', component: ConversationsComponent },

      {
        path: 'users',
        loadChildren: () => import('../management/management.module').then(m => m.ManagementModule)
      },

      { path: 'audit', component: AuditComponent },
      { path: 'connections', component: ConnectionsComponent },

      { path: 'api-integrations', component: ApiIntegrationsComponent },

      { path: 'credentials', redirectTo: 'connections', pathMatch: 'full' },
      { path: 'credentials/console', component: ConnectionsComponent },

      { path: 'system-config', redirectTo: 'connections', pathMatch: 'full' },
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule {}
