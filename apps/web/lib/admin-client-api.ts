/**
 * Admin-domain equivalent of clientFetch (lib/client-api.ts). Always calls
 * the separate /api/admin-proxy/* route, never /api/proxy/* -- keeping the
 * two token domains from ever sharing a code path on the client side either.
 */
export async function adminClientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/admin-proxy${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(errorBody.message ?? `Request failed (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
