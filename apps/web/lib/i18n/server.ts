import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "@/lib/preferences-cookies";
import { dictionaries, type TranslationKey } from "./dictionaries";

// Server Components can't use the client usePreferences() hook, so they read
// the locale cookie directly and translate with the same dictionaries. Keeps
// one source of truth for translations across server and client.
export function getLocale(): Locale {
  const cookie = cookies().get(LOCALE_COOKIE)?.value;
  return isLocale(cookie) ? cookie : DEFAULT_LOCALE;
}

export function getServerT() {
  const locale = getLocale();
  return (key: TranslationKey) =>
    dictionaries[locale]?.[key] ?? dictionaries[DEFAULT_LOCALE][key] ?? key;
}
