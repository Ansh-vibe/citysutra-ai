import { z } from "zod";
import { SPATIAL_RESOLUTION_NOTE, SOURCES } from "../config";
import type {
  AirContext,
  EnvironmentalObservation,
  ProviderResult,
  WeatherContext,
} from "../types";

/**
 * Open-Meteo provider adapters (air quality + weather).
 * - finite timeout, non-200 handling, Zod-validated response shapes
 * - in-memory TTL cache to stay inside provider rate limits
 * - honest provenance: grid forecast/assimilation, never a street sensor
 * - on failure returns an ok:false result; never substitutes fake values
 */

const NUM = z.number().nullable();
const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Map<string, { at: number; value: unknown }>();

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "CitySutraAI/1.0 (hackathon demo; non-commercial)" },
    });
    if (!res.ok) throw new Error(`upstream HTTP ${res.status}`);
    const json: unknown = await res.json();
    cache.set(url, { at: Date.now(), value: json });
    return json;
  } catch (e) {
    throw new Error(
      e instanceof DOMException && e.name === "AbortError"
        ? "upstream request timed out"
        : e instanceof Error
          ? e.message
          : "upstream request failed"
    );
  } finally {
    clearTimeout(timer);
  }
}

/* Open-Meteo returns LOCAL wall-clock strings ("2026-02-03T14:00") when a
   timezone is requested. We request Asia/Kolkata and parse with +05:30. */
const IST_MS = 5.5 * 3600 * 1000;
function localTimeMs(t: string): number {
  return new Date(`${t}:00+05:30`).getTime();
}
function toIso(t: string): string {
  return new Date(localTimeMs(t)).toISOString();
}
/** index of the first hour that starts after "now" (so idx-1 = last completed hour) */
function firstFutureIdx(times: string[]): number {
  const nowMs = Date.now() + IST_MS;
  for (let i = 0; i < times.length; i++) if (localTimeMs(times[i]) > nowMs) return i;
  return times.length;
}

const airSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  hourly: z.object({
    time: z.array(z.string()).min(1),
    pm2_5: z.array(NUM).optional(),
    pm10: z.array(NUM).optional(),
    us_aqi: z.array(NUM).optional(),
    nitrogen_dioxide: z.array(NUM).optional(),
    ozone: z.array(NUM).optional(),
  }),
});

const weatherSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  hourly: z.object({
    time: z.array(z.string()).min(1),
    temperature_2m: z.array(NUM).optional(),
    apparent_temperature: z.array(NUM).optional(),
    relative_humidity_2m: z.array(NUM).optional(),
    precipitation: z.array(NUM).optional(),
    precipitation_probability: z.array(NUM).optional(),
    wind_speed_10m: z.array(NUM).optional(),
    wind_direction_10m: z.array(NUM).optional(),
  }),
});

function pick<T>(arr: T[] | undefined, i: number): number | null {
  if (!arr || i < 0 || i >= arr.length) return null;
  const v = arr[i];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export async function fetchAirContext(lat: number, lon: number): Promise<AirContext> {
  const providerName = "Open-Meteo Air Quality API";
  const url =
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}` +
    `&hourly=pm2_5,pm10,us_aqi,nitrogen_dioxide,ozone&past_days=1&forecast_days=2&timezone=Asia%2FKolkata`;
  const fetchedAt = new Date().toISOString();
  try {
    const raw = airSchema.parse(await fetchJson(url));
    const h = raw.hourly;
    const fi = firstFutureIdx(h.time);
    const cur = fi > 0 ? fi - 1 : 0; // last completed hour (assimilated grid)
    const isCurrentHourForecast = fi === h.time.length;

    const usAqi = pick(h.us_aqi, cur);
    const pm25 = pick(h.pm2_5, cur);
    const pm10 = pick(h.pm10, cur);
    const no2 = pick(h.nitrogen_dioxide, cur);
    const o3 = pick(h.ozone, cur);

    const mkObs = (
      variable: string,
      value: number | null,
      unit: string,
      standard?: string
    ): EnvironmentalObservation | null =>
      value === null
        ? null
        : {
            id: `om-air-${variable}`,
            sourceName: providerName,
            sourceUrl: SOURCES.openMeteoAir,
            variable,
            value,
            unit,
            timestamp: toIso(h.time[cur]),
            fetchedAt,
            observationType: "modeled",
            spatialResolution: "~15–25 km grid",
            providerStandard: standard,
            qualityNote: `${SPATIAL_RESOLUTION_NOTE} Value is a grid assimilation for the completed hour — not a street sensor reading.`,
          };

    const observations = [
      mkObs("us_aqi", usAqi, "index", "US EPA AQI (not CPCB NAQI)"),
      mkObs("pm2_5", pm25, "µg/m³"),
      mkObs("pm10", pm10, "µg/m³"),
      mkObs("no2", no2, "µg/m³"),
      mkObs("ozone", o3, "µg/m³"),
    ].filter((o): o is EnvironmentalObservation => o !== null);

    return {
      provider: {
        ok: true,
        status: "ok",
        provider: providerName,
        sourceUrl: SOURCES.openMeteoAir,
        fetchedAt,
        data: {
          observations,
          hourly: {
            time: h.time.map(toIso),
            pm25: h.pm2_5 ?? [],
            pm10: h.pm10 ?? [],
            usAqi: h.us_aqi ?? [],
            no2: h.nitrogen_dioxide ?? [],
            o3: h.ozone ?? [],
          },
          current: {
            time: toIso(h.time[cur]),
            usAqi,
            pm25,
            pm10,
            isForecast: isCurrentHourForecast,
          },
        },
      },
    };
  } catch (e) {
    return {
      provider: {
        ok: false,
        status: "error",
        provider: providerName,
        sourceUrl: SOURCES.openMeteoAir,
        fetchedAt,
        error: e instanceof Error ? e.message : "provider error",
      },
    };
  }
}

export async function fetchWeatherContext(lat: number, lon: number): Promise<WeatherContext> {
  const providerName = "Open-Meteo Forecast API";
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,precipitation_probability,wind_speed_10m,wind_direction_10m&past_days=1&forecast_days=2&timezone=Asia%2FKolkata`;
  const fetchedAt = new Date().toISOString();
  try {
    const raw = weatherSchema.parse(await fetchJson(url));
    const h = raw.hourly;
    const fi = firstFutureIdx(h.time);
    const cur = fi > 0 ? fi - 1 : 0;

    // next 6 hours = the 6 hours starting from the first future hour
    const future = h.time.slice(fi, fi + 6);
    const precip = (h.precipitation ?? []).slice(fi, fi + 6);
    const prob = (h.precipitation_probability ?? []).slice(fi, fi + 6);
    let rainNext6hMm: number | null = null;
    if (future.length > 0) {
      rainNext6hMm = precip.reduce((s: number, v, i) => {
        if (i >= future.length) return s;
        return s + (typeof v === "number" && Number.isFinite(v) ? v : 0);
      }, 0);
      rainNext6hMm = Math.round(rainNext6hMm * 10) / 10;
    }
    let maxProbNext6h: number | null = null;
    if (future.length > 0) {
      const vals = prob.slice(0, future.length).filter((v): v is number => typeof v === "number");
      maxProbNext6h = vals.length > 0 ? Math.max(...vals) : null;
    }

    return {
      provider: {
        ok: true,
        status: "ok",
        provider: providerName,
        sourceUrl: SOURCES.openMeteoWeather,
        fetchedAt,
        data: {
          hourly: {
            time: h.time.map(toIso),
            temperature: h.temperature_2m ?? [],
            apparent: h.apparent_temperature ?? [],
            humidity: h.relative_humidity_2m ?? [],
            precipitation: h.precipitation ?? [],
            precipitationProbability: h.precipitation_probability ?? [],
            windSpeed: h.wind_speed_10m ?? [],
            windDirection: h.wind_direction_10m ?? [],
          },
          current: {
            time: toIso(h.time[cur]),
            temperature: pick(h.temperature_2m, cur),
            apparent: pick(h.apparent_temperature, cur),
            humidity: pick(h.relative_humidity_2m, cur),
            isForecast: fi === h.time.length,
          },
          rainNext6hMm,
          maxProbNext6h,
        },
      },
    };
  } catch (e) {
    return {
      provider: {
        ok: false,
        status: "error",
        provider: providerName,
        sourceUrl: SOURCES.openMeteoWeather,
        fetchedAt,
        error: e instanceof Error ? e.message : "provider error",
      },
    };
  }
}
