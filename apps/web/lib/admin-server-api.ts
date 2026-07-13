import { cookies } from "next/headers";
import { ADMIN_ACCESS_COOKIE } from "./admin-session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * Admin-domain equivalent of serverFetch (lib/server-api.ts). Reads the
 * st_admin_access cookie only -- never falls back to the tenant session, so
 * a Server Component under (platform-admin)/admin can't accidentally
 * authenticate with a customer's token.
 */
export async function adminServerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const accessToken = cookies().get(ADMIN_ACCESS_COOKIE)?.value;
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
    throw new Error(`Admin API ${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
