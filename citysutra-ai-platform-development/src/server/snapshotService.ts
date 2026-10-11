import { DEFAULT_WEIGHTS } from "@/lib/config";
import { SIMULATED_US_AQI } from "@/lib/demoData";
import { buildSnapshotContext } from "@/lib/snapshot";
import { buildActions, evaluateInteractions } from "@/lib/recommendations";
import { computePriority } from "@/lib/priority";
import { fetchAirContext, fetchWeatherContext } from "@/lib/providers/openMeteo";
import { getPreviewRepository, getRepository } from "./repository";
import type { DimensionId, DimensionValue, RecommendedAction } from "@/lib/types";

/**
 * Assembles the cross-track operational snapshot:
 * live provider data + incidents → dimensions → priority → actions.
 * Provider failures never crash the app; they surface as ok:false.
 */

export interface SnapshotInput {
  lat: number;
  lon: number;
  demoAir: boolean;
}

export interface Snapshot {
  location: { lat: number; lon: number };
  generatedAt: string;
  backendMode: "local-postgres" | "dynamodb";
  air: ReturnType<typeof fetchAirContext> extends Promise<infer T> ? T : never;
  weather: ReturnType<typeof fetchWeatherContext> extends Promise<infer T> ? T : never;
  context: {
    dims: Partial<Record<DimensionId, DimensionValue>>;
    missing: DimensionId[];
    airStandard: "us";
    airElevated: boolean;
    airValue: number | null;
    airIsForecast: boolean;
    rainNext6hMm: number | null;
    maxProbNext6h: number | null;
    heatApparentC: number | null;
  };
  cityPriority: ReturnType<typeof computePriority>;
  interactions: ReturnType<typeof evaluateInteractions>;
  actions: RecommendedAction[];
  incidentsCount: { total: number; active: number };
}

export async function buildSnapshot(input: SnapshotInput): Promise<Snapshot> {
  const nowIso = new Date().toISOString();
  let repo = getRepository();
  try {
    await repo.ensureSeeded();
  } catch {
    repo = getPreviewRepository();
    await repo.ensureSeeded();
  }

  const [air, weather, incidents, actionStatuses] = await Promise.all([
    fetchAirContext(input.lat, input.lon),
    fetchWeatherContext(input.lat, input.lon),
    repo.listIncidents({ limit: 200 }),
    repo.listActionStatuses(),
  ]);

  const ctx = buildSnapshotContext(air, weather, incidents, {
    simulatedAirUsAqi: input.demoAir ? SIMULATED_US_AQI : null,
    nowIso,
  });

  const interactions = evaluateInteractions(incidents, ctx);
  const actions = buildActions(incidents, ctx, actionStatuses);
  const cityPriority = computePriority(
    {
      dimensions: ctx.dims,
      applicable: ["A", "H", "W", "G"],
      interactions,
    },
    DEFAULT_WEIGHTS
  );

  return {
    location: { lat: input.lat, lon: input.lon },
    generatedAt: nowIso,
    backendMode: repo.mode,
    air: air as Snapshot["air"],
    weather: weather as Snapshot["weather"],
    context: {
      dims: {
        A: ctx.dims.A,
        H: ctx.dims.H,
        W: ctx.dims.W,
        G: ctx.dims.G,
      },
      missing: ctx.missing,
      airStandard: ctx.airStandard,
      airElevated: ctx.airElevated,
      airValue: ctx.airValue,
      airIsForecast: ctx.airIsForecast,
      rainNext6hMm: ctx.rainNext6hMm,
      maxProbNext6h: ctx.maxProbNext6h,
      heatApparentC: ctx.heatApparentC,
    },
    cityPriority,
    interactions,
    actions,
    incidentsCount: {
      total: incidents.length,
      active: incidents.filter((i) =>
        ["reported", "reviewed", "assigned"].includes(i.status)
      ).length,
    },
  };
}
