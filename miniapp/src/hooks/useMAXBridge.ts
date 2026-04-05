// MAX Mini App Bridge — window.WebApp
// Docs: https://dev.max.ru/docs/webapps/bridge
// Script: https://st.max.ru/js/max-web-app.js

export interface WebAppUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface WebAppData {
  query_id?: string;
  auth_date?: number;
  hash?: string;
  start_param?: string;
  user?: WebAppUser;
  chat?: { id: number; type: string };
}

export interface BackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
}

export interface HapticFeedback {
  impactOccurred(style: 'soft' | 'light' | 'medium' | 'heavy' | 'rigid', disableVibration?: boolean): void;
  notificationOccurred(type: 'error' | 'success' | 'warning', disableVibration?: boolean): void;
  selectionChanged(disableVibration?: boolean): void;
}

export interface MAXWebApp {
  initData: string;
  initDataUnsafe: WebAppData;
  platform: string;
  version: string;

  ready(): void;
  close(): void;
  requestContact(): Promise<{ phone: string }>;
  openLink(url: string): void;
  openMaxLink(url: string): void;
  shareContent(params: { text?: string; link?: string }): void;
  shareMaxContent(params: { mid?: string; chatType?: string; text?: string; link?: string }): void;
  downloadFile(url: string, filename: string): void;

  onEvent(eventName: string, callback: (...args: unknown[]) => void): void;
  offEvent(eventName: string, callback: (...args: unknown[]) => void): void;

  BackButton: BackButton;
  HapticFeedback: HapticFeedback;
}

declare global {
  interface Window {
    WebApp?: MAXWebApp;
  }
}

/**
 * Get the MAX Web App bridge object.
 * Returns null when running outside MAX (dev environment).
 */
export function useMAXBridge(): MAXWebApp | null {
  if (typeof window !== 'undefined' && window.WebApp) {
    return window.WebApp;
  }
  return null;
}
