import { ACTIVE_STATUSES, THRESHOLDS } from "./config";
import { computePriority } from "./priority";
import type { SnapshotContext } from "./snapshot";
import type {
  DimensionId,
  Incident,
  InteractionEffect,
  RecommendedAction,
  Track,
} from "./types";
import { hashId } from "./utils";

/**
 * Rule-based, explainable action generator.
 * Every action carries its rule id, supporting evidence, missing data,
 * assumptions and a concrete next step for a human operator.
 */

interface RuleSpec {
  ruleId: string;
  match: (i: Incident) => boolean;
  title: (matched: Incident[]) => string;
  applicable: DimensionId[];
  owner: string;
  nextStep: string;
  rationale: (matched: Incident[], ctx: SnapshotContext) => string;
  assumptions: string[];
}

const isActive = (i: Incident) => ACTIVE_STATUSES.includes(i.status);

const RULES: RuleSpec[] = [
  {
    ruleId: "AIR-1",
    match: (i) => i.category === "open_burning" || i.category === "smoke_observation",
    title: () => "Verify smoke source and review with environmental team",
    applicable: ["A", "G"],
    owner: "Municipal environmental cell / fire & rescue (verification)",
    nextStep:
      "Dispatch a verification visit to confirm the smoke source; cross-check against the air-quality index band before any enforcement step.",
    rationale: (_m, ctx) =>
      `A credible smoke/burning report is active${
        ctx.airElevated
          ? ` and the air signal is elevated (${ctx.airStandard.toUpperCase()} AQI ${ctx.airValue} — "Unhealthy" band).`
          : `; the current air index is ${ctx.airValue !== null ? `${ctx.airValue}` : "unavailable"} so the air condition must be re-checked.`
      } Correlation between this report and the elevated signal is not proven by the data — verification is required.`,
    assumptions: [
      "Grid-scale AQI (15–25 km) used as a neighborhood proxy.",
      "Report location is accurate within ~500 m.",
    ],
  },
  {
    ruleId: "WTR-1",
    match: (i) => i.category === "water_leak" || i.category === "cooling_resource_gap",
    title: () => "Assess water loss; route to verified utility complaint channel",
    applicable: ["H", "W"],
    owner: "Delhi Jal Board (via official public complaint channel — NOT auto-filed)",
    nextStep:
      "Quantify the leak (flow estimate on site) and file through the Jal Board's published complaint channels; this app does not submit to the utility.",
    rationale: (m, ctx) =>
      `Active water-loss report${m.length > 1 ? "s" : ""}${
        (ctx.heatApparentC ?? 0) >= THRESHOLDS.heat.maxC - 3
          ? " during hot conditions, which raises both loss and public-health exposure."
          : "."
      } No causation is claimed between weather and the leak; heat only changes urgency.`,
    assumptions: [
      "Leak persists until a human confirms repair.",
      "Reported location is within the correct utility zone.",
    ],
  },
  {
    ruleId: "DRN-1",
    match: (i) =>
      i.category === "blocked_drain" ||
      i.category === "waterlogging" ||
      i.category === "flooding_risk" ||
      i.category === "drain_waste_blockage",
    title: () => "Inspect drainage and assign responsible team",
    applicable: ["W", "H"],
    owner: "Municipal drainage / public-works team",
    nextStep:
      "Inspect the blocked drain before the forecast rain window; assign a crew and confirm the blockage cause (silt vs waste).",
    rationale: (_m, ctx) =>
      ctx.rainNext6hMm !== null || ctx.maxProbNext6h !== null
        ? `Active drainage report with a forecast of ${ctx.rainNext6hMm ?? 0} mm rain (max probability ${ctx.maxProbNext6h ?? "n/a"} %) in the next 6 h — pre-emptive inspection reduces flood risk.`
        : "Active drainage report; rain forecast is unavailable, so schedule inspection based on severity.",
    assumptions: [
      "6-hour grid rainfall is a neighborhood proxy.",
      "Crew availability within the next 24 h.",
    ],
  },
  {
    ruleId: "WST-1",
    match: (i) =>
      i.category === "overflowing_bin" ||
      i.category === "missed_collection" ||
      i.category === "accumulated_waste",
    title: () => "Inspect, schedule collection, and enforce segregation",
    applicable: ["G", "W"],
    owner: "Municipal solid-waste collection team",
    nextStep:
      "Schedule an ad-hoc collection; where bins are segregated, keep streams separate at pickup and log the recovery share.",
    rationale: (m) =>
      `${m.length} active collection-related report(s). Unmanaged accumulation raises both the waste-pressure dimension and the likelihood of open burning.`,
    assumptions: [
      "Collection vehicle capacity available same-day.",
      "Severity reflects visible volume, not measured tonnage.",
    ],
  },
  {
    ruleId: "WST-2",
    match: (i) => i.category === "recovery_opportunity",
    title: () => "Run material-diversion scenario for the reported opportunity",
    applicable: ["G"],
    owner: "Waste-management / recyclable-aggregator team",
    nextStep:
      "Visit the site, sample the material, and feed real volumes into the Impact Studio before committing a route.",
    rationale: () =>
      "A recovery opportunity is reported. Diversion potential is scenario-based: run the calculator with verified volumes — do not treat default factors as measured performance.",
    assumptions: [
      "Reported volumes are approximations until sampled.",
      "Default conversion factors are illustrative (see Methodology).",
    ],
  },
];

const TRACK_DIMS: Record<Track, DimensionId[]> = {
  air: ["A"],
  heatwater: ["H", "W"],
  waste: ["G"],
};

function incidentLabel(i: Incident): string {
  return `${i.locationLabel} · ${i.title}`;
}

/** Evaluate the four interaction rules against city context + incidents.
 *  Returns effects plus which incident ids triggered each (for attribution). */
export function evaluateInteractions(
  incidents: Incident[],
  ctx: SnapshotContext
): Array<InteractionEffect & { incidentIds: string[] }> {
  const active = incidents.filter(isActive);
  const ids = (cats: string[]) =>
    active.filter((i) => cats.includes(i.category)).map((i) => i.incidentId);

  const t = THRESHOLDS.interaction;
  const rules: Array<InteractionEffect & { incidentIds: string[]; triggered: boolean }> = [
    {
      ruleId: "R-01",
      label: "Open burning + elevated air signal",
      bonus: 10,
      evidence: [],
      incidentIds: ids(["open_burning", "smoke_observation"]),
      triggered:
        ctx.airElevated &&
        ids(["open_burning", "smoke_observation"]).length > 0,
    },
    {
      ruleId: "R-02",
      label: "Drain blockage / waterlogging + forecast rain",
      bonus: 10,
      evidence: [],
      incidentIds: ids(["blocked_drain", "waterlogging", "flooding_risk", "drain_waste_blockage"]),
      triggered:
        ((ctx.rainNext6hMm !== null && ctx.rainNext6hMm >= t.rainMm6h) ||
          (ctx.maxProbNext6h !== null && ctx.maxProbNext6h >= t.rainProbPct)) &&
        ids(["blocked_drain", "waterlogging", "flooding_risk", "drain_waste_blockage"]).length > 0,
    },
    {
      ruleId: "R-03",
      label: "Heat stress + active water issue",
      bonus: 8,
      evidence: [],
      incidentIds: ids(["water_leak", "cooling_resource_gap"]),
      triggered:
        (ctx.dims.H?.value ?? -1) >= t.heatIndex && ids(["water_leak", "cooling_resource_gap"]).length > 0,
    },
    {
      ruleId: "R-04",
      label: "Waste pressure + collection strain",
      bonus: 5,
      evidence: [],
      incidentIds: ids(["overflowing_bin", "missed_collection", "accumulated_waste"]),
      triggered:
        (ctx.dims.G?.value ?? -1) >= t.wastePressure &&
        ids(["overflowing_bin", "missed_collection", "accumulated_waste"]).length >= t.minCollectionIncidents,
    },
  ];

  return rules.map((r) => {
    const incNames = incidents
      .filter((i) => r.incidentIds.includes(i.incidentId))
      .map(incidentLabel);
    const cond: string[] = [];
    if (r.ruleId === "R-01") cond.push(`AQI ${ctx.airValue ?? "n/a"} (threshold ≥ ${THRESHOLDS.airElevatedAqi})`);
    if (r.ruleId === "R-02") cond.push(`rain 6h ${ctx.rainNext6hMm ?? "n/a"} mm / prob ${ctx.maxProbNext6h ?? "n/a"} %`);
    if (r.ruleId === "R-03") cond.push(`heat dimension ${ctx.dims.H?.value ?? "n/a"}`);
    if (r.ruleId === "R-04") cond.push(`waste dimension ${ctx.dims.G?.value ?? "n/a"}`);
    return {
      ruleId: r.ruleId,
      label: r.label,
      bonus: r.bonus,
      triggered: r.triggered,
      incidentIds: r.incidentIds,
      evidence: r.triggered ? [...incNames, ...cond] : cond,
    };
  });
}

function evidenceSummary(matched: Incident[], ctx: SnapshotContext): string {
  const parts = matched.map((i) => `${i.title} (${i.locationLabel}, sev ${i.severity})`);
  if (ctx.airValue !== null)
    parts.push(`${ctx.airStandard.toUpperCase()} AQI ${ctx.airValue} (${ctx.airIsForecast ? "forecast" : "latest"}${ctx.dims.A?.status === "simulated" ? ", SIMULATED" : ""})`);
  if (ctx.rainNext6hMm !== null) parts.push(`${ctx.rainNext6hMm} mm rain / 6 h forecast`);
  return parts.join(" · ");
}

export function buildActions(
  incidents: Incident[],
  ctx: SnapshotContext,
  statuses: Record<string, RecommendedAction["status"]> = {}
): RecommendedAction[] {
  const interactions = evaluateInteractions(incidents, ctx);
  const active = incidents.filter(isActive);
  const actions: RecommendedAction[] = [];
  const matchedIds = new Set<string>();

  for (const rule of RULES) {
    const matched = active.filter(rule.match);
    if (matched.length === 0) continue;
    matched.forEach((i) => matchedIds.add(i.incidentId));
    const incidentIds = matched.map((i) => i.incidentId).sort();
    const actionId = `act-${rule.ruleId}-${hashId(incidentIds.join("|"))}`;
    const applicable = rule.applicable;

    // Interaction bonuses apply only when the rule's incident evidence is
    // fully part of this action's evidence set (transparent attribution).
    const interactionsForAction = interactions
      .filter((fx) => fx.incidentIds.every((id) => incidentIds.includes(id)))
      .map(({ incidentIds: _drop, ...rest }) => rest);

    const priority = computePriority({
      dimensions: ctx.dims,
      applicable,
      interactions: interactionsForAction,
    });

    actions.push({
      actionId,
      ruleId: rule.ruleId,
      title: rule.title(matched),
      incidentIds,
      affectedTracks: [...new Set(matched.map((i) => i.track))] as Track[],
      priorityScore: priority.score,
      priority,
      evidenceSummary: evidenceSummary(matched, ctx),
      rationale: rule.rationale(matched, ctx),
      recommendedOwner: rule.owner,
      recommendedNextStep: rule.nextStep,
      status: statuses[actionId] ?? "open",
      assumptions: [...rule.assumptions, ...priority.note ? [priority.note] : []],
      generatedAt: ctx.generatedAt,
    });
  }

  // Fallback: any still-uncovered active incident with severity ≥ 4.
  for (const i of active) {
    if (matchedIds.has(i.incidentId) || i.severity < 4) continue;
    const actionId = `act-FALLBACK-${hashId(i.incidentId)}`;
    const applicable = TRACK_DIMS[i.track];
    const priority = computePriority({
      dimensions: ctx.dims,
      applicable,
      interactions: [],
    });
    actions.push({
      actionId,
      ruleId: "FALLBACK",
      title: `Field verification — ${i.title}`,
      incidentIds: [i.incidentId],
      affectedTracks: [i.track],
      priorityScore: priority.score,
      priority,
      evidenceSummary: evidenceSummary([i], ctx),
      rationale: `High-severity report (sev ${i.severity}) not covered by a specific rule. A human should verify on the ground before it is triaged further.`,
      recommendedOwner: "Neighborhood response coordinator",
      recommendedNextStep: "Visit location, confirm condition, then route to the responsible team.",
      status: statuses[actionId] ?? "open",
      assumptions: ["City-wide grid data is a neighborhood proxy."],
      generatedAt: ctx.generatedAt,
    });
  }

  return actions.sort((a, b) => (b.priorityScore ?? -1) - (a.priorityScore ?? -1));
}
