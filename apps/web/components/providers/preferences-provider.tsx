"use client";

import * as React from "react";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  LOCALE_COOKIE,
  THEME_COOKIE,
  type Locale,
  type Theme,
} from "@/lib/preferences-cookies";
import { dictionaries, type TranslationKey } from "@/lib/i18n/dictionaries";

interface PreferencesContextValue {
  theme: Theme;
  locale: Locale;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null);

function writeCookie(name: string, value: string) {
  // 1 year, root path. Not httpOnly on purpose -- theme/locale are non-secret
  // and the client applies them directly for instant, no-flash switching.
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

async function persistToServer(prefs: { theme?: Theme; locale?: Locale }) {
  // Best-effort DB persistence so the choice follows the user across devices.
  // Failure here is non-fatal: the cookie already applied the change locally.
  await fetch("/api/preferences", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  }).catch(() => undefined);
}

export function PreferencesProvider({
  children,
  initialTheme,
  initialLocale,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
  initialLocale: Locale;
}) {
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale);

  const applyTheme = React.useCallback((t: Theme) => {
    const root = document.documentElement;
    root.classList.toggle("dark", t === "dark");
  }, []);

  const setTheme = React.useCallback(
    (t: Theme) => {
      setThemeState(t);
      applyTheme(t);
      writeCookie(THEME_COOKIE, t);
      void persistToServer({ theme: t });
    },
    [applyTheme]
  );

  const setLocale = React.useCallback((l: Locale) => {
    setLocaleState(l);
    writeCookie(LOCALE_COOKIE, l);
    document.documentElement.lang = l;
    void persistToServer({ locale: l });
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const t = React.useCallback(
    (key: TranslationKey) => dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key,
    [locale]
  );

  const value = React.useMemo<PreferencesContextValue>(
    () => ({ theme, locale, setTheme, toggleTheme, setLocale, t }),
    [theme, locale, setTheme, toggleTheme, setLocale, t]
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = React.useContext(PreferencesContext);
  if (!ctx) {
    // Safe fallback so components used outside the provider (e.g. the admin
    // area, which has its own chrome) don't crash -- they just get defaults.
    return {
      theme: DEFAULT_THEME,
      locale: DEFAULT_LOCALE,
      setTheme: () => undefined,
      toggleTheme: () => undefined,
      setLocale: () => undefined,
      t: (key) => dictionaries[DEFAULT_LOCALE][key] ?? key,
    };
  }
  return ctx;
}
