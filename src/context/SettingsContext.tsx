import { createContext, useContext, useEffect, useState } from 'react';

import { translate, type TranslationKey } from '../i18n/translations';

export type ThemeMode = 'dark' | 'light';
export type Language = 'pt' | 'en';

/** Themes/languages the UI can actually render today. */
export const AVAILABLE_THEMES: ThemeMode[] = ['dark', 'light'];
export const AVAILABLE_LANGUAGES: Language[] = ['pt', 'en'];

const THEME_KEY = 'bvd-theme';
const LANGUAGE_KEY = 'bvd-language';

type SettingsContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

function readStored<T extends string>(key: string, available: T[], fallback: T): T {
  const stored = window.localStorage.getItem(key) as T | null;
  return stored && available.includes(stored) ? stored : fallback;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => readStored(THEME_KEY, AVAILABLE_THEMES, 'dark'));
  const [language, setLanguage] = useState<Language>(() => readStored(LANGUAGE_KEY, AVAILABLE_LANGUAGES, 'pt'));

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
