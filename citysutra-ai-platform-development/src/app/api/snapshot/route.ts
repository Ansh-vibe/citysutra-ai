import { z } from "zod";
import { jsonError } from "@/server/apiUtils";
import { buildSnapshot } from "@/server/snapshotService";
import { CITIES, DEFAULT_CITY_ID } from "@/lib/config";

export const dynamic = "force-dynamic";

const query = z.object({
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
  demoAir: z.coerce.boolean().optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = query.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return jsonError(422, "Invalid query parameters");
  const city = CITIES.find((c) => c.id === DEFAULT_CITY_ID)!;
  try {
    const snap = await buildSnapshot({
      lat: parsed.data.lat ?? city.lat,
      lon: parsed.data.lon ?? city.lon,
      demoAir: parsed.data.demoAir ?? false,
    });
    return Response.json({ ok: true, snapshot: snap });
  } catch (e) {
    return jsonError(500, "Failed to build snapshot", e instanceof Error ? e.message : "unknown");
  }
}
