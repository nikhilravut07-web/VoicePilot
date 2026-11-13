import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";
import { hasSameOrigin } from "@/lib/server/origin";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return NextResponse.json({ detail: "Cross-origin request blocked." }, { status: 403 });
  const baseUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!baseUrl) return NextResponse.json({ detail: "Backend URL is not configured." }, { status: 503 });
  let payload: unknown;
  try { payload = await request.json(); } catch { return NextResponse.json({ detail: "Invalid JSON request." }, { status: 400 }); }
  try {
    const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload), cache: "no-store",
    });
    const body = await response.json();
    if (!response.ok) return NextResponse.json(body, { status: response.status });
    const servicesResponse = await fetch(`${baseUrl}/api/v1/services`, { headers: { Authorization: `Bearer ${body.access_token}` }, cache: "no-store" });
    const services = servicesResponse.ok ? await servicesResponse.json() : [];
    const business = body.business;
    const setupRequired = !business?.category || !business?.phone || !business?.address || !services?.length;
    const result = NextResponse.json({ user: body.user, business, setup_required: setupRequired });
    result.cookies.set(SESSION_COOKIE, body.access_token, {
      httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: body.expires_in,
    });
    return result;
  } catch {
    return NextResponse.json({ detail: "Unable to reach the backend. Confirm FastAPI is running." }, { status: 502 });
  }
}
