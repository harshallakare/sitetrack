import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import {
  LOCALE_COOKIE,
  THEME_COOKIE,
  isLocale,
  isTheme,
} from "@/lib/preferences-cookies";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Sets the theme/locale cookies (so SSR is consistent on the next load) and,
 * if the user has a tenant session, best-effort persists to the DB via the
 * API so the choice follows them across devices.
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });

  const cookieOpts = { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" as const };
  if (isTheme(body.theme)) res.cookies.set(THEME_COOKIE, body.theme, cookieOpts);
  if (isLocale(body.locale)) res.cookies.set(LOCALE_COOKIE, body.locale, cookieOpts);

  const accessToken = getAccessToken();
  if (accessToken && (isTheme(body.theme) || isLocale(body.locale))) {
    await fetch(`${API_URL}/auth/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        ...(isTheme(body.theme) ? { theme: body.theme } : {}),
        ...(isLocale(body.locale) ? { locale: body.locale } : {}),
      }),
    }).catch(() => undefined);
  }

  return res;
}
