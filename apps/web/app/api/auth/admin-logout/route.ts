import { NextResponse } from "next/server";
import { clearAdminAuthCookies, getAdminRefreshToken } from "@/lib/admin-session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function POST() {
  const refreshToken = getAdminRefreshToken();
  if (refreshToken) {
    await fetch(`${API_URL}/admin-auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  clearAdminAuthCookies();
  return NextResponse.json({ success: true });
}
