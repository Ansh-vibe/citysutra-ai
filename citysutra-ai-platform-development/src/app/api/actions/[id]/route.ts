import { z } from "zod";
import {
  clientIp,
  corsBlocked,
  jsonError,
  parseJson,
  throttled,
} from "@/server/apiUtils";
import { getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

const update = z.object({
  status: z.enum(["open", "accepted", "dismissed"]),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (corsBlocked(req)) return jsonError(403, "Origin not allowed");
  if (throttled(`act:${clientIp(req)}`, 20)) return jsonError(429, "Too many requests");
  const { id } = await params;
  const [data, err] = await parseJson(req, update);
  if (err) return err;
  try {
    await getRepository().upsertActionStatus(id, data.status);
    return Response.json({
      ok: true,
      message:
        "Recorded as an operator decision in this workspace only. No team was dispatched or authority notified.",
    });
  } catch (e) {
    return jsonError(500, "Failed to update action", e instanceof Error ? e.message : "unknown");
  }
}
