/**
 * For Client Components: always calls the same-origin Next.js proxy
 * (/api/proxy/*), never the NestJS API directly, so the access/refresh
 * tokens never have to be exposed to page JS -- they stay in httpOnly
 * cookies the proxy route reads server-side.
 */
export async function clientFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData;
  const res = await fetch(`/api/proxy${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
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
