import { createContext, useContext, useEffect, useState } from 'react';

import { translate, type TranslationKey } from '../i18n/translations';

export type ThemeMode = 'dark' | 'light';
export type Language = 'pt' | 'en';
/**
 * How the AI Consultant's system prompt is sourced. 'llama' is a UI-only
 * preference for now - the backend has no hook yet to actually generate a
 * prompt from the mapped process variants, so it still just uses the
 * predefined prompt regardless of this choice.
 */
export type PromptMode = 'predefined' | 'llama';

/** Themes/languages the UI can actually render today. */
export const AVAILABLE_THEMES: ThemeMode[] = ['dark', 'light'];
export const AVAILABLE_LANGUAGES: Language[] = ['pt', 'en'];
export const AVAILABLE_PROMPT_MODES: PromptMode[] = ['predefined', 'llama'];

const THEME_KEY = 'bvd-theme';
const LANGUAGE_KEY = 'bvd-language';
const PROMPT_MODE_KEY = 'bvd-prompt-mode';

type SettingsContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  promptMode: PromptMode;
  setPromptMode: (mode: PromptMode) => void;
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
  const [promptMode, setPromptMode] = useState<PromptMode>(() =>
    readStored(PROMPT_MODE_KEY, AVAILABLE_PROMPT_MODES, 'predefined'),
  );

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.setAttribute('lang', language);
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(PROMPT_MODE_KEY, promptMode);
  }, [promptMode]);

  const t = (key: TranslationKey, vars?: Record<string, string | number>) => translate(language, key, vars);

  return (
    <SettingsContext.Provider value={{ theme, setTheme, language, setLanguage, promptMode, setPromptMode, t }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
