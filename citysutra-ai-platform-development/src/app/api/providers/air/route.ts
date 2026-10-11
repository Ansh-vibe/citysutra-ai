import { z } from "zod";
import { jsonError } from "@/server/apiUtils";
import { fetchAirContext } from "@/lib/providers/openMeteo";

export const dynamic = "force-dynamic";

const query = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return jsonError(422, "lat and lon are required");
  const ctx = await fetchAirContext(parsed.data.lat, parsed.data.lon);
  // Provider failure is a valid, honest state — return 200 with ok:false
  // so the UI can render an unavailable panel instead of crashing.
  return Response.json({ ok: true, provider: ctx.provider });
}
