import { NextRequest, NextResponse } from "next/server";
import {
  clearAdminAuthCookies,
  getAdminAccessToken,
  getAdminRefreshToken,
  setAdminAuthCookies,
} from "@/lib/admin-session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

async function tryRefresh(): Promise<string | null> {
  const refreshToken = getAdminRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_URL}/admin-auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearAdminAuthCookies();
    return null;
  }
  const data = await res.json();
  setAdminAuthCookies(data.accessToken, data.refreshToken);
  return data.accessToken as string;
}

async function forward(req: NextRequest, path: string[]): Promise<NextResponse> {
  // Forwards the path as-is (callers pass the full "/admin/..." path, same
  // convention as adminServerFetch) -- this proxy is only ever used for the
  // platform-admin surface, never tenant routes.
  const targetUrl = `${API_URL}/${path.join("/")}${req.nextUrl.search}`;
  let accessToken = getAdminAccessToken();

  const contentType = req.headers.get("content-type") ?? "application/json";
  const bodyBuffer = req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

  const buildInit = (token: string | undefined): RequestInit => ({
    method: req.method,
    headers: {
      "content-type": contentType,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: bodyBuffer,
  });

  let apiRes = await fetch(targetUrl, buildInit(accessToken));

  if (apiRes.status === 401) {
    accessToken = (await tryRefresh()) ?? undefined;
    if (accessToken) {
      apiRes = await fetch(targetUrl, buildInit(accessToken));
    }
  }

  const responseBuffer = await apiRes.arrayBuffer();
  return new NextResponse(responseBuffer, {
    status: apiRes.status,
    headers: { "content-type": apiRes.headers.get("content-type") ?? "application/json" },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return forward(req, params.path);
}
