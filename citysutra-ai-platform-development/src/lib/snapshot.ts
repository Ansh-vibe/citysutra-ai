import { ACTIVE_STATUSES, THRESHOLDS } from "./config";
import type {
  AirContext,
  DimensionId,
  DimensionValue,
  Incident,
  WeatherContext,
} from "./types";
import { clamp, round } from "./utils";

/**
 * Dimension computation — converts provider output and incident state
 * into the 0–100 A / H / W / G values used by the priority engine.
 * Every transformation is documented in DIMENSION_META (config.ts).
 */

export interface SnapshotContext {
  dims: Partial<Record<DimensionId, DimensionValue>>;
  missing: DimensionId[];
  airStandard: "us";
  airElevated: boolean;
  airValue: number | null;
  airIsForecast: boolean;
  rainNext6hMm: number | null;
  maxProbNext6h: number | null;
  heatApparentC: number | null;
  generatedAt: string;
}

export function airDimension(air: AirContext): DimensionValue | null {
  if (!air.provider.ok || !air.provider.data) return null;
  const cur = air.provider.data.current;
  const v = cur.usAqi;
  if (v === null) return null;
  const label = "US AQI";
  return {
    id: "A",
    value: round(clamp(v, 0, 100), 1),
    source: `Open-Meteo grid forecast (${label})`,
    timestamp: cur.time,
    raw: { label, value: v, unit: "index" },
    note: `${cur.isForecast ? "Grid forecast for the current hour" : "Latest available grid value"} · ~15–25 km resolution · not CPCB National AQI`,
    status: "live",
  };
}

export function simulatedAirDimension(
  nowIso: string,
  usAqi: number
): DimensionValue {
  return {
    id: "A",
    value: round(clamp(usAqi, 0, 100), 1),
    source: "SIMULATED demo AQI (labeled placeholder)",
    timestamp: nowIso,
    raw: { label: "US AQI (simulated)", value: usAqi, unit: "index" },
    note: "Placeholder value for demonstration only — NOT a measured or live forecast reading.",
    status: "simulated",
  };
}

export function heatDimension(weather: WeatherContext): DimensionValue | null {
  if (!weather.provider.ok || !weather.provider.data) return null;
  const apparent = weather.provider.data.current.apparent;
  if (apparent === null) return null;
  const { minC, maxC } = THRESHOLDS.heat;
  const value =
    apparent <= minC
      ? 0
      : apparent >= maxC
        ? 100
        : ((apparent - minC) / (maxC - minC)) * 100;
  return {
    id: "H",
    value: round(value, 1),
    source: "Open-Meteo forecast (apparent temperature)",
    timestamp: weather.provider.data.current.time,
    raw: { label: "Apparent temp", value: round(apparent, 1), unit: "°C" },
    note: `Operational assumption: ${minC}→${maxC} °C mapped linearly to 0→100 (not an official alert)`,
    status: "live",
  };
}

export function waterDimension(weather: WeatherContext): DimensionValue | null {
  if (!weather.provider.ok || !weather.provider.data) return null;
  const { rainNext6hMm, maxProbNext6h } = weather.provider.data;
  if (rainNext6hMm === null && maxProbNext6h === null) return null;
  const { criticalMm6h, probWeight, rainWeight } = THRESHOLDS.rain;
  const mm = rainNext6hMm ?? 0;
  const prob = maxProbNext6h ?? 0;
  const value = Math.min(
    100,
    rainWeight * clamp(mm / criticalMm6h, 0, 1) * 100 + probWeight * (prob / 100) * 100
  );
  return {
    id: "W",
    value: round(value, 1),
    source: "Open-Meteo 6-hour rain forecast",
    timestamp: new Date().toISOString(),
    raw: { label: "Rain next 6 h", value: round(mm, 1), unit: "mm" },
    note: `Assumption: ${rainWeight * 100}% depth (${criticalMm6h} mm → max) + ${probWeight * 100}% probability`,
    status: "live",
  };
}

export function groundDimension(
  incidents: Incident[],
  nowIso: string
): DimensionValue | null {
  const active = incidents.filter(
    (i) => i.track === "waste" && ACTIVE_STATUSES.includes(i.status)
  );
  if (active.length === 0) {
    // No active waste reports: pressure is genuinely 0, not missing.
    return {
      id: "G",
      value: 0,
      source: "Derived from incident reports",
      timestamp: nowIso,
      raw: { label: "Active waste reports", value: 0, unit: "incidents" },
      note: "No active waste-track incidents in the workspace",
      status: "live",
    };
  }
  const sum = active.reduce((s, i) => s + i.severity * THRESHOLDS.wastePerIncident, 0);
  const latest = active.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b));
  return {
    id: "G",
    value: round(Math.min(100, sum), 1),
    source: "Derived from incident reports",
    timestamp: latest.updatedAt,
    raw: { label: "Active waste reports", value: active.length, unit: "incidents" },
    note: `Σ severity × ${THRESHOLDS.wastePerIncident} over ${active.length} active waste incident(s), capped at 100`,
    status: "live",
  };
}

export function buildSnapshotContext(
  air: AirContext,
  weather: WeatherContext,
  incidents: Incident[],
  opts: { simulatedAirUsAqi: number | null; nowIso: string }
): SnapshotContext {
  const dims: Partial<Record<DimensionId, DimensionValue>> = {};
  const missing: DimensionId[] = [];

  // Explicit demo choice wins (and is always labeled SIMULATED in the UI);
  // otherwise use the live grid value, and fall back to the labeled
  // simulated placeholder only when the live feed is unavailable.
  let A: DimensionValue | null = null;
  if (opts.simulatedAirUsAqi !== null) {
    A = simulatedAirDimension(opts.nowIso, opts.simulatedAirUsAqi);
  } else {
    A = airDimension(air);
  }
  if (A) dims.A = A;
  else missing.push("A");

  const H = heatDimension(weather);
  if (H) dims.H = H;
  else missing.push("H");

  const W = waterDimension(weather);
  if (W) dims.W = W;
  else missing.push("W");

  const G = groundDimension(incidents, opts.nowIso);
  if (G) dims.G = G;
  else missing.push("G");

  const airData = air.provider.ok ? air.provider.data : undefined;
  const weatherData = weather.provider.ok ? weather.provider.data : undefined;

  const airValue =
    A && A.status === "live"
      ? A.raw.value
      : A?.status === "simulated"
        ? A.raw.value
        : null;

  return {
    dims,
    missing,
    airStandard: "us",
    airElevated: airValue !== null && airValue >= THRESHOLDS.airElevatedAqi,
    airValue,
    airIsForecast: airData?.current.isForecast ?? true,
    rainNext6hMm: weatherData?.rainNext6hMm ?? null,
    maxProbNext6h: weatherData?.maxProbNext6h ?? null,
    heatApparentC: weatherData?.current.apparent ?? null,
    generatedAt: opts.nowIso,
  };
}
