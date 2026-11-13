import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const baseUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!token || !baseUrl) return NextResponse.json({ detail: "Not signed in." }, { status: 401 });
  const headers = { Authorization: `Bearer ${token}` };
  try {
    const [userResponse, businessResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/auth/me`, { headers, cache: "no-store" }),
      fetch(`${baseUrl}/api/v1/business`, { headers, cache: "no-store" }),
    ]);
    if (!userResponse.ok || !businessResponse.ok) {
      const response = NextResponse.json({ detail: "Session expired." }, { status: 401 });
      response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
      return response;
    }
    const [user, business] = await Promise.all([userResponse.json(), businessResponse.json()]);
    return NextResponse.json({ user, business });
  } catch {
    return NextResponse.json({ detail: "Unable to reach the backend." }, { status: 502 });
  }
}
