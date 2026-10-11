import { z } from "zod";
import {
  clientIp,
  corsBlocked,
  jsonError,
  parseJson,
  throttled,
} from "@/server/apiUtils";
import { incidentCreateSchema, incidentsQuerySchema } from "@/lib/schemas";
import { getPreviewRepository, getRepository } from "@/server/repository";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = incidentsQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries())
  );
  if (!parsed.success) return jsonError(422, "Invalid query parameters");
  try {
    let repo = getRepository();
    try {
      await repo.ensureSeeded();
    } catch {
      repo = getPreviewRepository();
      await repo.ensureSeeded();
    }
    const incidents = await repo.listIncidents(parsed.data);
    return Response.json({ ok: true, incidents, count: incidents.length });
  } catch (e) {
    return jsonError(500, "Failed to load incidents", e instanceof Error ? e.message : "unknown");
  }
}

export async function POST(req: Request) {
  if (corsBlocked(req)) return jsonError(403, "Origin not allowed");
  if (throttled(`inc:${clientIp(req)}`, 10)) return jsonError(429, "Too many requests");
  const [input, err] = await parseJson(req, incidentCreateSchema);
  if (err) return err;
  try {
    const incident = await getRepository().createIncident(input);
    return Response.json(
      {
        ok: true,
        incident,
        notification:
          "Stored in the CitySutra workspace only. No government authority or utility was notified.",
      },
      { status: 201 }
    );
  } catch (e) {
    return jsonError(500, "Failed to create incident", e instanceof Error ? e.message : "unknown");
  }
}
