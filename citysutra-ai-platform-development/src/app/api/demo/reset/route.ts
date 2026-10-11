import { corsBlocked, jsonError, jsonOk, throttled, clientIp } from "@/server/apiUtils";
import { getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

/** Reproducible demo dataset reset. */
export async function POST(req: Request) {
  if (corsBlocked(req)) return jsonError(403, "Origin not allowed");
  if (throttled(`reset:${clientIp(req)}`, 5)) return jsonError(429, "Too many requests");
  try {
    const res = await getRepository().resetDemo();
    return jsonOk({ ...res, message: "Demo dataset reset. All records are labeled DEMO." });
  } catch (e) {
    return jsonError(500, "Reset failed", e instanceof Error ? e.message : "unknown");
  }
}
