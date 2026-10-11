import {
  DEFAULT_WEIGHTS,
  DIMENSION_META,
  INTERACTION_RULES,
  SOURCES,
  THRESHOLDS,
  IMPACT_DEFAULTS,
} from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * Machine-readable methodology: every weight, threshold, interaction
 * rule and source the application uses. Consumable by API clients.
 */
export async function GET() {
  return Response.json({
    ok: true,
    score: {
      name: "Civic Action Priority",
      range: "0–100",
      disclaimer:
        "An operational triage score. NOT an official AQI, medical-risk score, government warning or scientifically validated prediction.",
      formula: "score = min(100, Σ (w_i / Σw) * value_i + Σ triggered interaction bonuses)",
      weights: DEFAULT_WEIGHTS,
      renormalisation:
        "When a dimension has no valid data it is excluded and weights are renormalised over available dimensions. Missing data is never treated as zero; if no dimension is available no score is shown.",
      dimensions: DIMENSION_META,
      thresholds: THRESHOLDS,
      interactionRules: INTERACTION_RULES,
    },
    impactDefaults: IMPACT_DEFAULTS,
    sources: SOURCES,
    officialReferences: {
      cpcbNationalAqi: SOURCES.cpcbAqi,
      delhiJalBoardComplaints: SOURCES.jalBoard,
    },
    notes: [
      "Open-Meteo values are grid-scale (≈15–25 km) forecasts/assimilations, not street-level sensors.",
      "US AQI is shown exactly as provided; CPCB National AQI is not computed.",
      "All scenario calculator outputs are estimates, not measured outcomes.",
    ],
  });
}
