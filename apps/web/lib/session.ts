import { cookies } from "next/headers";

export const ACCESS_COOKIE = "st_access";
export const REFRESH_COOKIE = "st_refresh";

const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/** Only callable from Route Handlers / Server Actions (cookies() is mutable there). */
export function setAuthCookies(accessToken: string, refreshToken: string) {
  const store = cookies();
  store.set(ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: 60 * 15 });
  store.set(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: 60 * 60 * 24 * 30 });
}

export function clearAuthCookies() {
  const store = cookies();
  store.delete(ACCESS_COOKIE);
  store.delete(REFRESH_COOKIE);
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_COOKIE)?.value;
}

export function getRefreshToken(): string | undefined {
  return cookies().get(REFRESH_COOKIE)?.value;
}
