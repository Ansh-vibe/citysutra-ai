import type {
  DimensionId,
  IncidentCategory,
  IncidentStatus,
  Track,
} from "./types";

/**
 * Single source of truth for configurable operational assumptions.
 * Every value here is surfaced on the /methodology page and in API
 * responses so nothing in the scoring model is hidden.
 */

/* ------------------------------ city model ------------------------------ */

export interface CityPreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
}

export const CITIES: CityPreset[] = [
  { id: "delhi-cp", name: "Central Delhi · Connaught Place", lat: 28.6315, lon: 77.2167, country: "IN" },
  { id: "delhi-kb", name: "Delhi · Karol Bagh", lat: 28.6519, lon: 77.1907, country: "IN" },
  { id: "delhi-east", name: "Delhi · Shahdara (east)", lat: 28.6599, lon: 77.3062, country: "IN" },
  { id: "delhi-dwarka", name: "Delhi · Dwarka (west)", lat: 28.5921, lon: 77.046, country: "IN" },
  { id: "mumbai", name: "Mumbai · CST area", lat: 18.9386, lon: 72.8355, country: "IN" },
  { id: "bengaluru", name: "Bengaluru · MG Road", lat: 12.9757, lon: 77.5923, country: "IN" },
];

export const DEFAULT_CITY_ID = "delhi-cp";

/* ------------------------------ tracks ----------------------------------- */

export const TRACK_META: Record<Track, { label: string; short: string; color: string }> = {
  air: { label: "Air", short: "A", color: "#4356c6" },
  heatwater: { label: "Heat & Water", short: "H·W", color: "#d97706" },
  waste: { label: "Waste & Energy", short: "G", color: "#0f766e" },
};

export const CATEGORIES: Record<
  IncidentCategory,
  { label: string; track: Track; hint: string }
> = {
  water_leak: { label: "Water leakage", track: "heatwater", hint: "Visible leaking pipe, manhole overflow, or unexplained pooling from a line." },
  waterlogging: { label: "Waterlogging", track: "heatwater", hint: "Standing water on roads or low-lying areas." },
  blocked_drain: { label: "Blocked drainage", track: "heatwater", hint: "Open or covered drain not flowing, backing up." },
  flooding_risk: { label: "Possible flooding", track: "heatwater", hint: "Condition that could flood nearby houses or roads." },
  heat_infrastructure: { label: "Heat-related infrastructure concern", track: "heatwater", hint: "Water cooler broken, shade structure damaged, transformer overheating reports." },
  cooling_resource_gap: { label: "Missing cooling / water resource", track: "heatwater", hint: "Public drinking water or cooling point reported absent or non-functional." },
  overflowing_bin: { label: "Overflowing bin", track: "waste", hint: "Community bin overflowing onto the street." },
  missed_collection: { label: "Missed collection", track: "waste", hint: "Scheduled door-to-door or community collection did not happen." },
  mixed_waste: { label: "Mixed waste handling", track: "waste", hint: "Segregated streams mixed at transfer or collection point." },
  open_burning: { label: "Open waste burning", track: "waste", hint: "Visible burning of waste / plastic / paper." },
  accumulated_waste: { label: "Accumulated waste", track: "waste", hint: "Waste pile-up beyond scheduled pickup cycle." },
  drain_waste_blockage: { label: "Drain blockage (waste)", track: "waste", hint: "Drain blocked by waste material specifically." },
  recovery_opportunity: { label: "Recyclable / wet-waste recovery opportunity", track: "waste", hint: "Location with recoverable recyclables or wet waste worth diversion." },
  smoke_observation: { label: "Smoke / emission observation", track: "air", hint: "Unexplained smoke plume not tied to a known waste-burning report." },
};

export const CATEGORY_LIST = Object.entries(CATEGORIES).map(([id, m]) => ({
  id: id as IncidentCategory,
  ...m,
}));

export const STATUS_META: Record<IncidentStatus, { label: string; color: string }> = {
  reported: { label: "Reported", color: "#e0533d" },
  reviewed: { label: "Reviewed", color: "#d97706" },
  assigned: { label: "Assigned", color: "#4356c6" },
  resolved: { label: "Resolved", color: "#0f766e" },
  rejected: { label: "Rejected", color: "#6b7280" },
};

export const ACTIVE_STATUSES: IncidentStatus[] = ["reported", "reviewed", "assigned"];

export const STATUS_FLOW: Record<IncidentStatus, IncidentStatus[]> = {
  reported: ["reviewed", "rejected"],
  reviewed: ["assigned", "reported", "rejected"],
  assigned: ["resolved", "reviewed"],
  resolved: ["assigned"],
  rejected: ["reported"],
};

/* --------------------------- priority model ------------------------------ */

export const DIMENSION_META: Record<
  DimensionId,
  { label: string; track: Track; description: string }
> = {
  A: { label: "Air", track: "air", description: "Latest reported US AQI from Open-Meteo's air-quality product (the provider does not offer an EU AQI series). Already an index on 0–100+, so A = clamp(AQI, 0, 100). This is NOT India's CPCB National AQI." },
  H: { label: "Heat", track: "heatwater", description: "Linear map of apparent temperature: ≤32 °C → 0, ≥42 °C → 100. A configurable operational assumption, not an official heat alert." },
  W: { label: "Water", track: "heatwater", description: "Rainfall pressure for the next 6 h: 70% weight on depth (25 mm → 100) + 30% on max precipitation probability. Configurable assumption." },
  G: { label: "Ground (waste)", track: "waste", description: "Derived from active waste-track incidents: Σ severity × 12, capped at 100. A city-wide proxy for waste pressure, not a measured field condition." },
};

export const DEFAULT_WEIGHTS: Record<DimensionId, number> = {
  A: 0.3,
  H: 0.25,
  W: 0.2,
  G: 0.25,
};

export const THRESHOLDS = {
  heat: { minC: 32, maxC: 42 },
  rain: { criticalMm6h: 25, probWeight: 0.3, rainWeight: 0.7 },
  wastePerIncident: 12,
  airElevatedAqi: 100, // US AQI ≥ 100 = "Unhealthy" band (EPA bands; NOT CPCB NAQI)
  interaction: {
    rainMm6h: 10,
    rainProbPct: 60,
    heatIndex: 70,
    wastePressure: 60,
    minCollectionIncidents: 2,
  },
} as const;

export interface InteractionRuleDef {
  id: string;
  label: string;
  bonus: number;
  description: string;
}

export const INTERACTION_RULES: InteractionRuleDef[] = [
  {
    id: "R-01",
    label: "Open burning + elevated air signal",
    bonus: 10,
    description:
      "An active open-burning / smoke report is present while the selected AQI reads ≥ 100 (US AQI 'Unhealthy' band).",
  },
  {
    id: "R-02",
    label: "Drain blockage / waterlogging + forecast rain",
    bonus: 10,
    description:
      "An active blocked-drain, waterlogging or flooding-risk report is present and ≥ 10 mm rain (or ≥ 60 % probability) is forecast within 6 hours.",
  },
  {
    id: "R-03",
    label: "Heat stress + active water issue",
    bonus: 8,
    description:
      "Heat dimension ≥ 70 while an active water-leak / cooling-resource report is present.",
  },
  {
    id: "R-04",
    label: "Waste pressure + collection strain",
    bonus: 5,
    description:
      "Waste dimension ≥ 60 with at least 2 active collection-related incidents (overflow, missed collection, accumulation).",
  },
];

/* ------------------------------ sources ---------------------------------- */

export const SOURCES = {
  openMeteoAir: "https://open-meteo.com/en/docs/air-quality-api",
  openMeteoWeather: "https://open-meteo.com/en/docs",
  cpcbAqi: "https://airquality.cpcb.gov.in/ccr_docs/About_AQI.pdf",
  jalBoard:
    "https://delhijalboard.delhi.gov.in/jalboard/important-phone-numbers-complaints-redressal",
  osmCopyright: "© OpenStreetMap contributors",
  osmUrl: "https://www.openstreetmap.org/copyright",
} as const;

export const SPATIAL_RESOLUTION_NOTE =
  "Open-Meteo grid products resolve at roughly 15–25 km. Values are area-scale forecasts/assimilations, not street-level sensor readings.";

/* --------------------------- impact defaults ----------------------------- */
/* Illustrative, clearly-labeled defaults for the scenario calculator.
   They are user-editable and never presented as measured outcomes. */

export const IMPACT_DEFAULTS = {
  co2ePerTonneOrganicDivertedT: 0.0545, // t CO2e per t organic diverted from unmanaged disposal (simplified IPCC-style, see methodology)
  co2ePerKmCollectionKg: 0.35, // kg CO2e per collection-km (assumed small truck, loaded+return)
  biogasKwhPerTonneWet: 100, // kWh per t wet waste in a small-scale biodigester (illustrative)
  waterRatePerKlINR: 65, // ₹ per kL for treated municipal water (illustrative)
  daysPerYear: 365,
} as const;
