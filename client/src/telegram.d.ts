interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

interface TelegramWebApp {
  initData?: string;
  initDataUnsafe?: { user?: TelegramUser };
  version?: string;
  ready?: () => void;
  close?: () => void;
  expand?: () => void;
  colorScheme?: string;
  sendData?: (data: string) => void;
}

interface Telegram {
  WebApp: TelegramWebApp;
}

interface Window {
  Telegram?: Telegram;
}
