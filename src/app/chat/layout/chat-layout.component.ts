import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { Subscription } from 'rxjs';

@Component({
  standalone: false,
  selector: 'app-chat-layout',
  templateUrl: './chat-layout.component.html',
  styleUrls: ['./chat-layout.component.scss']
})
export class ChatLayoutComponent implements OnInit, OnDestroy {
  sidebarOpen = true;
  private sub = new Subscription();

  constructor(public chatService: ChatService) {}

  ngOnInit(): void {
    this.chatService.loadConversations();

    if (window.innerWidth < 768) {
      this.sidebarOpen = false;
    }
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {

    if (event.ctrlKey && event.shiftKey && event.key === 'N') {
      event.preventDefault();
      this.chatService.newChat();
    }

    if (event.ctrlKey && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      this.toggleSidebar();
    }

    if (event.key === '/' && !this.isInputFocused()) {
      event.preventDefault();
      const input = document.querySelector('app-chat-input textarea') as HTMLTextAreaElement;
      input?.focus();
    }
  }

  private isInputFocused(): boolean {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || (el as HTMLElement).isContentEditable;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }
}
