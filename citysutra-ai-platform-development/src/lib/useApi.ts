"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastFetch: number | null;
  refetch: () => void;
}

/** Minimal data-fetching hook with honest loading/error states. */
export function useApi<T>(path: string, deps: unknown[] = []): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(path)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<T>;
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLastFetch(Date.now());
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "request failed");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, tick, ...deps]);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  return { data, error, loading, lastFetch, refetch };
}

/** Fire a mutation; returns {run, busy, error, result} */
export function useMutate<TBody, TR>(path: string, method: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TR | null>(null);

  const run = useCallback(
    async (body?: TBody) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(path, {
          method,
          headers: { "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({}))) as TR & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error ?? `HTTP ${res.status}`);
        }
        setResult(json);
        return json;
      } catch (e) {
        setError(e instanceof Error ? e.message : "request failed");
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [path, method]
  );

  return { run, busy, error, result };
}
