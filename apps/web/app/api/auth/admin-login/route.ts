import { NextRequest, NextResponse } from "next/server";
import { setAdminAuthCookies } from "@/lib/admin-session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const apiRes = await fetch(`${API_URL}/admin-auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await apiRes.json();

  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  setAdminAuthCookies(data.accessToken, data.refreshToken);
  return NextResponse.json({ user: data.user });
}
