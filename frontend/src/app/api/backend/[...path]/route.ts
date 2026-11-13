import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/server/session";
import { hasSameOrigin } from "@/lib/server/origin";

export const runtime = "nodejs";
type RouteContext = { params: Promise<{ path: string[] }> };

const methodRules: { pattern: RegExp; methods: string[] }[] = [
  { pattern: /^business$/, methods: ["GET", "PATCH"] },
  { pattern: /^services$/, methods: ["GET", "POST"] },
  { pattern: /^services\/[a-f0-9-]+$/i, methods: ["PATCH", "DELETE"] },
  { pattern: /^receptionist-config$/, methods: ["GET", "PATCH"] },
  { pattern: /^calls$/, methods: ["GET"] },
  { pattern: /^calls\/[a-zA-Z0-9-]+$/, methods: ["GET"] },
  { pattern: /^appointments$/, methods: ["GET", "POST"] },
  { pattern: /^appointments\/[a-f0-9-]+$/i, methods: ["PATCH"] },
  { pattern: /^integrations$/, methods: ["GET"] },
  { pattern: /^integrations\/google-calendar$/, methods: ["GET"] },
];

async function forward(request: NextRequest, context: RouteContext) {
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    if (!hasSameOrigin(request)) return NextResponse.json({ detail: "Cross-origin request blocked." }, { status: 403 });
  }
  const { path } = await context.params;
  if (!path.length || path.some((segment) => !/^[a-zA-Z0-9_-]+$/.test(segment))) {
    return NextResponse.json({ detail: "Invalid API path." }, { status: 400 });
  }
  const relativePath = path.join("/");
  const allowed = methodRules.some((rule) => rule.pattern.test(relativePath) && rule.methods.includes(method));
  if (!allowed) return NextResponse.json({ detail: "This API operation is not available." }, { status: 404 });

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const baseUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!token) return NextResponse.json({ detail: "Session expired." }, { status: 401 });
  if (!baseUrl) return NextResponse.json({ detail: "Backend URL is not configured." }, { status: 503 });

  const target = new URL(`${baseUrl}/api/v1/${relativePath}`);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.append(key, value));
  const headers = new Headers({ Authorization: `Bearer ${token}` });
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  try {
    const response = await fetch(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" || method === "DELETE" ? undefined : await request.text(),
      cache: "no-store",
    });
    const responseBody = response.status === 204 ? null : await response.text();
    const result = new NextResponse(responseBody, { status: response.status, headers: { "Content-Type": response.headers.get("content-type") ?? "application/json" } });
    if (response.status === 401) result.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return result;
  } catch {
    return NextResponse.json({ detail: "Unable to reach the backend. Please try again." }, { status: 502 });
  }
}

export const GET = forward;
export const POST = forward;
export const PATCH = forward;
export const DELETE = forward;
