"use client";

export class ApiError extends Error {
  status: number;
  fields?: string[];

  constructor(message: string, status: number, fields?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

function detailMessage(payload: unknown): { message: string; fields?: string[] } {
  if (payload && typeof payload === "object" && "detail" in payload) {
    const detail = (payload as { detail: unknown }).detail;
    if (typeof detail === "string") return { message: detail };
    if (Array.isArray(detail)) {
      const fields = detail.map((issue) => {
        if (!issue || typeof issue !== "object") return "Invalid input";
        const record = issue as { msg?: string; loc?: unknown[] };
        const field = record.loc?.filter((part) => part !== "body").join(" → ");
        return field ? `${field}: ${record.msg ?? "Invalid value"}` : record.msg ?? "Invalid input";
      });
      return { message: fields.join(". "), fields };
    }
  }
  return { message: "The request could not be completed. Please try again." };
}

export function apiErrorMessage(payload: unknown, fallback = "The request could not be completed. Please try again.") {
  const parsed = detailMessage(payload);
  return parsed.message === "The request could not be completed. Please try again." ? fallback : parsed.message;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`/api/backend/${path.replace(/^\//, "")}`, {
    ...init,
    headers,
    credentials: "same-origin",
    cache: "no-store",
  });
  if (response.status === 401 && typeof window !== "undefined") {
    // This shared client has no React router context; a full page navigation resets expired sessions safely.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?reason=expired");
    throw new ApiError("Your session expired. Please sign in again.", 401);
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = detailMessage(payload);
    throw new ApiError(error.message, response.status, error.fields);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
