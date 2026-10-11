import { z } from "zod";
import { CATEGORIES, STATUS_FLOW } from "./config";
import type { Incident, IncidentStatus, Severity } from "./types";

/**
 * Shared Zod schemas — used by API routes, forms and tests.
 */

export const severitySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
]);

const CATEGORY_IDS = [
  "water_leak",
  "waterlogging",
  "blocked_drain",
  "flooding_risk",
  "heat_infrastructure",
  "cooling_resource_gap",
  "overflowing_bin",
  "missed_collection",
  "mixed_waste",
  "open_burning",
  "accumulated_waste",
  "drain_waste_blockage",
  "recovery_opportunity",
  "smoke_observation",
] as const satisfies readonly Incident["category"][];

export const incidentCategorySchema = z.enum(CATEGORY_IDS);

export const incidentCreateSchema = z
  .object({
    category: incidentCategorySchema,
    title: z.string().trim().min(3, "Title must be at least 3 characters").max(120),
    description: z.string().trim().min(10, "Describe the incident in at least 10 characters").max(2000),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    locationLabel: z.string().trim().min(2).max(160),
    severity: severitySchema,
    evidenceType: z.enum(["citizen", "sensor", "official", "simulated"]),
    sourceName: z.string().trim().min(2).max(80),
    confidence: z.enum(["low", "medium", "high"]),
    wardId: z.string().trim().max(40).optional(),
    isDemo: z.boolean().default(false),
    photoRef: z.string().max(400).optional(),
  })
  .refine((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude), {
    message: "Coordinates must be finite numbers",
  });

export type IncidentCreateInput = z.infer<typeof incidentCreateSchema>;

export const incidentStatusSchema = z.enum(["reported", "reviewed", "assigned", "resolved", "rejected"]);

export const incidentUpdateSchema = z
  .object({
    status: incidentStatusSchema,
    rejectReason: z.string().trim().min(5).max(500).optional(),
  })
  .refine((v) => v.status !== "rejected" || (v.rejectReason && v.rejectReason.length >= 5), {
    message: "A rejection reason (≥ 5 characters) is required when rejecting",
    path: ["rejectReason"],
  });

export function assertValidTransition(
  current: IncidentStatus,
  next: IncidentStatus
): string | null {
  const allowed = STATUS_FLOW[current];
  if (!allowed || !allowed.includes(next)) {
    return `Status cannot move from "${current}" to "${next}". Allowed: ${allowed.join(", ")}.`;
  }
  return null;
}

export function trackFor(category: Incident["category"]): Incident["track"] {
  return CATEGORIES[category].track;
}

export const locationSchema = z
  .object({
    lat: z.number().min(-90).max(90),
    lon: z.number().min(-180).max(180),
    label: z.string().trim().min(2).max(160).optional(),
  });

export const cityQuerySchema = z
  .object({
    lat: z.coerce.number().min(-90).max(90),
    lon: z.coerce.number().min(-180).max(180),
    aqiStandard: z.enum(["us", "eu"]).optional(),
    demoAir: z.coerce.boolean().optional(),
  });

export const incidentsQuerySchema = z.object({
  track: z.enum(["air", "heatwater", "waste"]).optional(),
  status: z.enum(["reported", "reviewed", "assigned", "resolved", "rejected"]).optional(),
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export function parseIncidentRecord(raw: Record<string, unknown>): Incident {
  // Re-validate a stored record; throws on malformed shape.
  const parsed = z
    .object({
      incidentId: z.string(),
      category: incidentCategorySchema,
      track: z.enum(["air", "heatwater", "waste"]),
      title: z.string(),
      description: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      locationLabel: z.string(),
      wardId: z.string().optional(),
      severity: severitySchema,
      status: z.enum(["reported", "reviewed", "assigned", "resolved", "rejected"]),
      evidenceType: z.enum(["citizen", "sensor", "official", "simulated"]),
      sourceName: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      createdAt: z.string(),
      updatedAt: z.string(),
      isDemo: z.boolean(),
      rejectReason: z.string().optional(),
      photoRef: z.string().optional(),
    })
    .parse(raw);
  return parsed as Incident;
}

export type { Severity };
