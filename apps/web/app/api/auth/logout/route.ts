import { NextResponse } from "next/server";
import { clearAuthCookies, getRefreshToken } from "@/lib/session";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

export async function POST() {
  const refreshToken = getRefreshToken();
  if (refreshToken) {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => undefined);
  }
  clearAuthCookies();
  return NextResponse.json({ success: true });
}
