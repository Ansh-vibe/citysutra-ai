import { z } from "zod";

/** Shared helpers for API route handlers. */

export function jsonError(status: number, message: string, detail?: unknown) {
  return Response.json({ ok: false, error: message, detail }, { status });
}

export function jsonOk<T>(data: T, init?: number) {
  return Response.json({ ok: true, ...data }, { status: init ?? 200 });
}

/** Restrict CORS to the app origin (and localhost during development). */
export function corsBlocked(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>([
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ]);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) allowed.add(appUrl);
  return !allowed.has(origin);
}

/* Tiny in-memory throttle: max N requests per key per window. */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function throttled(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  b.count += 1;
  return b.count > limit;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local"
  );
}

/** Parse & validate a JSON body; returns [data, errorResponse]. */
export async function parseJson<T>(
  req: Request,
  schema: z.ZodType<T>
): Promise<[T, null] | [null, Response]> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return [null, jsonError(400, "Request body must be valid JSON")];
  }
  const res = schema.safeParse(body);
  if (!res.success) {
    const issues = res.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return [null, jsonError(422, "Validation failed", issues)];
  }
  return [res.data, null];
}
