// Non-httpOnly cookies (theme + locale are not sensitive and the client
// reads them directly). Read server-side in the root layout for no-flash
// SSR, written client-side on change for instant application.
export const THEME_COOKIE = "st_theme";
export const LOCALE_COOKIE = "st_locale";

export type Theme = "light" | "dark";
export type Locale = "en" | "hi";

export const DEFAULT_THEME: Theme = "light";
export const DEFAULT_LOCALE: Locale = "en";

export function isTheme(v: string | undefined): v is Theme {
  return v === "light" || v === "dark";
}
export function isLocale(v: string | undefined): v is Locale {
  return v === "en" || v === "hi";
}
