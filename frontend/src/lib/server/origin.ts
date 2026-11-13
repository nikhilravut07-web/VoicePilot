import type { NextRequest } from "next/server";

/** Blocks cross-site state changes to cookie-setting/authentication routes. */
export function hasSameOrigin(request: NextRequest) {
  // Use the request Host rather than client-supplied forwarding headers.
  const host = request.headers.get("host");
  const protocol = request.nextUrl.protocol.replace(":", "");
  return Boolean(host && request.headers.get("origin") === `${protocol}://${host}`);
}
