import { createContext, useContext, useEffect, useState } from 'react';

export type ThemeMode = 'dark' | 'light';
export type Language = 'pt' | 'en';

/** Themes/languages the UI can actually render today - used to guard against
 * a stale localStorage value pointing at something not yet implemented. */
export const AVAILABLE_THEMES: ThemeMode[] = ['dark'];
export const AVAILABLE_LANGUAGES: Language[] = ['pt'];

const THEME_KEY = 'bvd-theme';
const LANGUAGE_KEY = 'bvd-language';

type SettingsContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  language: Language;
  setLanguage: (language: Language) => void;
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
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
  }, [language]);

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage }}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
