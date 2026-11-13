import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";
import { hasSameOrigin } from "@/lib/server/origin";

export async function POST(request: NextRequest) {
  if (!hasSameOrigin(request)) return NextResponse.json({ detail: "Cross-origin request blocked." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
  return response;
}
