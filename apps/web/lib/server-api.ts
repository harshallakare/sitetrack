import { cookies } from "next/headers";
import { ACCESS_COOKIE } from "./session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * For Server Components / Server Actions only: reads the access token
 * directly from the httpOnly cookie and calls the NestJS API server-side
 * (no network hop through Next's own route handlers). Does not attempt a
 * refresh on 401 -- the access token TTL (15m) is short enough that this is
 * an acceptable MVP simplification; middleware handles the "no session at
 * all" case by redirecting to /login before any Server Component runs.
 */
export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = cookies().get(ACCESS_COOKIE)?.value;
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
