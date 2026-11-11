import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'agent_theme_preference';
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  
  public isDarkMode$ = this.isDarkModeSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initTheme();
  }

  private initTheme(): void {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem(this.THEME_KEY);
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
      this.setDarkMode(isDark);
    }
  }

  public toggleTheme(): void {
    this.setDarkMode(!this.isDarkModeSubject.value);
  }

  public setDarkMode(isDark: boolean): void {
    this.isDarkModeSubject.next(isDark);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
      if (isDark) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    }
  }

  public get isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }
}
