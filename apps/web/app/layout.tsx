import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { PreferencesProvider } from "@/components/providers/preferences-provider";
import {
  DEFAULT_LOCALE,
  DEFAULT_THEME,
  LOCALE_COOKIE,
  THEME_COOKIE,
  isLocale,
  isTheme,
} from "@/lib/preferences-cookies";

export const metadata: Metadata = {
  title: "SiteTrack",
  description: "Construction site expense and vendor management",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Read prefs from cookies server-side so the correct theme class + lang are
  // present in the very first HTML -- no flash of the wrong theme on load.
  const store = cookies();
  const themeCookie = store.get(THEME_COOKIE)?.value;
  const localeCookie = store.get(LOCALE_COOKIE)?.value;
  const theme = isTheme(themeCookie) ? themeCookie : DEFAULT_THEME;
  const locale = isLocale(localeCookie) ? localeCookie : DEFAULT_LOCALE;

  return (
    <html lang={locale} className={theme === "dark" ? "dark" : undefined}>
      <body>
        <PreferencesProvider initialTheme={theme} initialLocale={locale}>
          {children}
        </PreferencesProvider>
      </body>
    </html>
  );
}
