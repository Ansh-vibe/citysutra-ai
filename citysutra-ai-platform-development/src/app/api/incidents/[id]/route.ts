import {
  assertValidTransition,
  incidentUpdateSchema,
} from "@/lib/schemas";
import {
  clientIp,
  corsBlocked,
  jsonError,
  parseJson,
  throttled,
} from "@/server/apiUtils";
import { getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    const incident = await getRepository().getIncident(id);
    if (!incident) return jsonError(404, "Incident not found");
    return Response.json({ ok: true, incident });
  } catch (e) {
    return jsonError(500, "Failed to load incident", e instanceof Error ? e.message : "unknown");
  }
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (corsBlocked(req)) return jsonError(403, "Origin not allowed");
  if (throttled(`upd:${clientIp(req)}`, 20)) return jsonError(429, "Too many requests");
  const { id } = await params;
  const [update, err] = await parseJson(req, incidentUpdateSchema);
  if (err) return err;
  try {
    const repo = getRepository();
    const current = await repo.getIncident(id);
    if (!current) return jsonError(404, "Incident not found");
    const transitionError = assertValidTransition(current.status, update.status);
    if (transitionError) return jsonError(409, transitionError);
    const updated = await repo.updateIncidentStatus(
      id,
      update.status,
      update.status === "rejected" ? update.rejectReason : undefined
    );
    return Response.json({ ok: true, incident: updated });
  } catch (e) {
    return jsonError(
      500,
      "Failed to update incident",
      e instanceof Error ? e.message : "unknown"
    );
  }
}
