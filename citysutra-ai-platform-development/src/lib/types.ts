/**
 * CitySutra AI — shared domain model.
 * Pure types only (no runtime logic) so they can be shared between
 * the Next.js app, API routes, tests and the Lambda handler contract.
 */

export type Track = "air" | "heatwater" | "waste";

export type IncidentStatus =
  | "reported"
  | "reviewed"
  | "assigned"
  | "resolved"
  | "rejected";

export type Severity = 1 | 2 | 3 | 4 | 5;

export type EvidenceType = "citizen" | "sensor" | "official" | "simulated";

export type Confidence = "low" | "medium" | "high";

export type IncidentCategory =
  | "water_leak"
  | "waterlogging"
  | "blocked_drain"
  | "flooding_risk"
  | "heat_infrastructure"
  | "cooling_resource_gap"
  | "overflowing_bin"
  | "missed_collection"
  | "mixed_waste"
  | "open_burning"
  | "accumulated_waste"
  | "drain_waste_blockage"
  | "recovery_opportunity"
  | "smoke_observation";

export interface Incident {
  incidentId: string;
  category: IncidentCategory;
  track: Track;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  locationLabel: string;
  wardId?: string;
  severity: Severity;
  status: IncidentStatus;
  evidenceType: EvidenceType;
  sourceName: string;
  confidence: Confidence;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  isDemo: boolean;
  rejectReason?: string;
  photoRef?: string;
}

export type ObservationType = "measured" | "forecast" | "modeled" | "simulated";

export interface EnvironmentalObservation {
  id: string;
  sourceName: string;
  sourceUrl: string;
  variable: string;
  value: number;
  unit: string;
  timestamp: string; // ISO-8601, time the value refers to
  fetchedAt: string; // ISO-8601, time we retrieved it
  observationType: ObservationType;
  spatialResolution?: string;
  providerStandard?: string;
  qualityNote?: string;
}

export type DimensionId = "A" | "H" | "W" | "G";

export interface DimensionValue {
  id: DimensionId;
  /** Normalised 0–100 */
  value: number;
  source: string;
  timestamp: string | null;
  raw: { label: string; value: number; unit: string };
  note: string;
  status: "live" | "simulated";
}

export interface PriorityComponent {
  dimension: DimensionId;
  label: string;
  value: number; // 0–100
  weight: number; // configured weight
  normalizedWeight: number; // weight after renormalisation
  contribution: number; // normalizedWeight * value
  source: string;
  timestamp: string | null;
}

export interface InteractionEffect {
  ruleId: string;
  label: string;
  bonus: number;
  triggered: boolean;
  evidence: string[];
}

export interface PriorityResult {
  /** null = insufficient data (never render as 0) */
  score: number | null;
  base: number;
  bonus: number;
  components: PriorityComponent[];
  missing: DimensionId[];
  interactions: InteractionEffect[];
  renormalized: boolean;
  note: string;
}

export type ActionStatus = "open" | "accepted" | "dismissed";

export interface RecommendedAction {
  actionId: string;
  ruleId: string;
  title: string;
  incidentIds: string[];
  affectedTracks: Track[];
  priorityScore: number | null;
  priority: PriorityResult;
  evidenceSummary: string;
  rationale: string;
  recommendedOwner: string;
  recommendedNextStep: string;
  status: ActionStatus;
  assumptions: string[];
  generatedAt: string;
}

export type ProviderStatus = "ok" | "error";

export interface ProviderResult<T> {
  ok: boolean;
  status: ProviderStatus;
  provider: string;
  sourceUrl: string;
  fetchedAt: string;
  /** present only when ok */
  data?: T;
  /** present only when not ok */
  error?: string;
}

export interface AirContext {
  provider: ProviderResult<{
    observations: EnvironmentalObservation[];
    hourly: {
      time: string[];
      pm25: (number | null)[];
      pm10: (number | null)[];
      usAqi: (number | null)[];
      no2: (number | null)[];
      o3: (number | null)[];
    };
    current: {
      time: string;
      usAqi: number | null;
      pm25: number | null;
      pm10: number | null;
      isForecast: boolean;
    };
  }>;
}

export interface WeatherContext {
  provider: ProviderResult<{
    hourly: {
      time: string[];
      temperature: (number | null)[];
      apparent: (number | null)[];
      humidity: (number | null)[];
      precipitation: (number | null)[];
      precipitationProbability: (number | null)[];
      windSpeed: (number | null)[];
      windDirection: (number | null)[];
    };
    current: {
      time: string;
      apparent: number | null;
      temperature: number | null;
      humidity: number | null;
      isForecast: boolean;
    };
    /** mm of rain forecast in the next 6 hours (from the current hour) */
    rainNext6hMm: number | null;
    /** max precipitation probability in the next 6 hours, 0–100 */
    maxProbNext6h: number | null;
  }>;
}
