import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Business, User } from "@/lib/types";

export const SESSION_COOKIE = "voicepilot_session";

export async function getServerSession(): Promise<{ user: User; business: Business } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const baseUrl = process.env.BACKEND_API_URL?.replace(/\/$/, "");
  if (!token || !baseUrl) return null;
  try {
    const headers = { Authorization: `Bearer ${token}` };
    const [userResponse, businessResponse] = await Promise.all([
      fetch(`${baseUrl}/api/v1/auth/me`, { headers, cache: "no-store" }),
      fetch(`${baseUrl}/api/v1/business`, { headers, cache: "no-store" }),
    ]);
    if (!userResponse.ok || !businessResponse.ok) return null;
    const [user, business] = await Promise.all([userResponse.json(), businessResponse.json()]);
    return { user, business };
  } catch {
    return null;
  }
}

export async function requireServerSession() {
  const session = await getServerSession();
  if (!session) redirect("/login?reason=expired");
  return session;
}
