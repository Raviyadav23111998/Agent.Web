import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { AdminRoutingModule } from './admin-routing.module';
import { AdminLayoutComponent } from './admin-layout/admin-layout.component';

import { DashboardComponent } from './dashboard/dashboard.component';
import { AgentsComponent } from './agents/agents.component';
import { MemoryBrowserComponent } from './memory-browser/memory-browser.component';
import { ConversationsComponent } from './conversations/conversations.component';
import { EmbedIntegrationsComponent } from './embed-integrations/embed-integrations.component';

import { AdminSearchComponent } from './admin-search/admin-search.component';
import { AuditComponent } from './audit/audit.component';
import { UiKitModule } from '../common/ui/ui-kit.module';
import { IconComponent } from '../common/components/icon/icon.component';

import { ApplicationsComponent } from '../chat/settings/applications/applications.component';
import { BotsComponent } from '../chat/settings/bots/bots.component';
import { CronsComponent } from '../chat/settings/crons/crons.component';
import { LlmSettingsComponent } from '../chat/settings/llm-settings/llm-settings.component';
import { KnowledgeComponent } from '../chat/settings/knowledge/knowledge.component';
import { ConnectionsComponent } from './connections/connections.component';
import { ApiIntegrationsComponent } from './api-integrations/api-integrations.component';
import { ChannelsComponent } from './channels/channels.component';
import { BrandingComponent } from './branding/branding.component';
import { LlmProfilesComponent } from './llm-profiles/llm-profiles.component';
import { SkillsComponent } from './skills/skills.component';

@NgModule({
  declarations: [
    AdminLayoutComponent,

    DashboardComponent,
    AgentsComponent,
    MemoryBrowserComponent,
    ConversationsComponent,

    AdminSearchComponent,
    AuditComponent,

    EmbedIntegrationsComponent,

    ApplicationsComponent,
    BotsComponent,
    CronsComponent,
    LlmSettingsComponent,
    KnowledgeComponent,
    ConnectionsComponent,
    ApiIntegrationsComponent,
    ChannelsComponent,
    BrandingComponent,
    LlmProfilesComponent,
    SkillsComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    AdminRoutingModule,
    UiKitModule,
    IconComponent,
  ]
})
export class AdminModule {}
