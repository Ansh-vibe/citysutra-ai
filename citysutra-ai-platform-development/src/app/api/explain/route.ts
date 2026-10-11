import { z } from "zod";
import {
  clientIp,
  corsBlocked,
  jsonError,
  parseJson,
  throttled,
} from "@/server/apiUtils";
import { explainAction } from "@/server/explain";

export const dynamic = "force-dynamic";

const explainSchema = z.object({
  title: z.string().min(1).max(200),
  ruleId: z.string().max(40),
  score: z.number().min(0).max(100).nullable(),
  base: z.number().nullable().optional(),
  bonus: z.number().nullable().optional(),
  components: z
    .array(
      z.object({
        dimension: z.string().max(8),
        label: z.string().max(60),
        value: z.number().min(0).max(100),
        contribution: z.number().min(0).max(100),
      })
    )
    .default([]),
  interactions: z
    .array(
      z.object({
        ruleId: z.string().max(12),
        label: z.string().max(120),
        bonus: z.number().min(0).max(50),
        triggered: z.boolean(),
      })
    )
    .default([]),
  missing: z.array(z.string().max(8)).default([]),
  owner: z.string().max(200),
  nextStep: z.string().max(500),
});

export async function POST(req: Request) {
  if (corsBlocked(req)) return jsonError(403, "Origin not allowed");
  if (throttled(`explain:${clientIp(req)}`, 10)) return jsonError(429, "Too many requests");
  const [input, err] = await parseJson(req, explainSchema);
  if (err) return err;
  try {
    const result = await explainAction({
      ...input,
      base: input.base ?? null,
      bonus: input.bonus ?? null,
    });
    return Response.json({
      ok: true,
      ...result,
      disclaimer:
        "Advisory explanation only. The deterministic Civic Action Priority is the source of truth; no action was dispatched or authority notified.",
    });
  } catch (e) {
    return jsonError(500, "Explanation failed", e instanceof Error ? e.message : "unknown");
  }
}
