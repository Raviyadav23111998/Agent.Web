import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { ChatRoutingModule } from './chat-routing.module';
import { ChatLayoutComponent } from './layout/chat-layout.component';
import { ChatHeaderComponent } from './header/chat-header.component';
import { SidebarComponent } from './sidebar/sidebar.component';
import { ProfileMenuComponent } from './profile/profile-menu.component';
import { ChatViewComponent } from './view/chat-view.component';
import { MessageBubbleComponent } from './view/message-bubble.component';
import { ChatInputComponent } from './view/chat-input.component';
import { TypingIndicatorComponent } from './view/typing-indicator.component';
import { MarkdownPipe } from './pipes/markdown.pipe';
import { IconComponent } from '../common/components/icon/icon.component';
import { UiKitModule } from '../common/ui/ui-kit.module';

@NgModule({
  declarations: [
    ChatLayoutComponent,
    ChatHeaderComponent,
    SidebarComponent,
    ProfileMenuComponent,
    ChatViewComponent,
    MessageBubbleComponent,
    ChatInputComponent,
    TypingIndicatorComponent,
    MarkdownPipe,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    ChatRoutingModule,
    IconComponent,
    UiKitModule,
  ]
})
export class ChatModule {}
