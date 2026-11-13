"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api-client";

export function useResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    setRevision((value) => value + 1);
  }, []);

  useEffect(() => {
    let alive = true;
    apiFetch<T>(path)
      .then((result) => { if (alive) setData(result); })
      .catch((reason: unknown) => {
        if (!alive) return;
        setError(reason instanceof ApiError ? reason.message : "Something went wrong. Please try again.");
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [path, revision]);

  return { data, loading, error, reload };
}
