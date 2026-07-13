import { cookies } from "next/headers";

// Deliberately distinct cookie names from lib/session.ts (st_access /
// st_refresh). A browser can hold a tenant session and an admin session at
// the same time, fully independently -- neither leaks into the other, and
// clearing one never touches the other.
export const ADMIN_ACCESS_COOKIE = "st_admin_access";
export const ADMIN_REFRESH_COOKIE = "st_admin_refresh";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Only callable from Route Handlers / Server Actions (cookies() is mutable there). */
export function setAdminAuthCookies(accessToken: string, refreshToken: string) {
  const store = cookies();
  store.set(ADMIN_ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: 60 * 15 });
  store.set(ADMIN_REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 7 });
}

export function clearAdminAuthCookies() {
  const store = cookies();
  store.delete(ADMIN_ACCESS_COOKIE);
  store.delete(ADMIN_REFRESH_COOKIE);
}

export function getAdminAccessToken(): string | undefined {
  return cookies().get(ADMIN_ACCESS_COOKIE)?.value;
}

export function getAdminRefreshToken(): string | undefined {
  return cookies().get(ADMIN_REFRESH_COOKIE)?.value;
}
