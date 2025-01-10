import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  lineHeight: number;
  theme: 'light' | 'dark' | 'sepia';
  viewMode: 'scroll' | 'paginated';
  margins: number;
  maxWidth: number;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 16,
  fontFamily: 'system-ui',
  lineHeight: 1.5,
  theme: 'light',
  viewMode: 'paginated',
  margins: 16,
  maxWidth: 800
};

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private settings = new BehaviorSubject<ReaderSettings>(DEFAULT_SETTINGS);
  settings$ = this.settings.asObservable();

  constructor() {
    this.loadSettings();
  }

  private async loadSettings() {
    try {
      const stored = localStorage.getItem('reader-settings');
      if (stored) {
        this.settings.next({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }

  async updateSettings(newSettings: Partial<ReaderSettings>) {
    const current = this.settings.value;
    const updated = { ...current, ...newSettings };
    this.settings.next(updated);
    localStorage.setItem('reader-settings', JSON.stringify(updated));
  }
}