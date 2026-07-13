import { NextRequest, NextResponse } from "next/server";
import { getAccessToken, setAuthCookies } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function POST(req: NextRequest) {
  const accessToken = getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const body = await req.text();
  const apiRes = await fetch(`${API_URL}/auth/switch-organization`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body,
  });
  const data = await apiRes.json();

  if (!apiRes.ok) {
    return NextResponse.json(data, { status: apiRes.status });
  }

  setAuthCookies(data.accessToken, data.refreshToken);
  return NextResponse.json({
    user: data.user,
    activeOrganization: data.activeOrganization,
    organizations: data.organizations,
  });
}
