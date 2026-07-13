import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Proxies to the API's public accept endpoint. No auth token involved -- the
// invitation token in the body is the credential.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const apiRes = await fetch(`${API_URL}/members/invitations/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const data = await apiRes.json().catch(() => ({}));
  return NextResponse.json(data, { status: apiRes.status });
}
