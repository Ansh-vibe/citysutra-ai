import { DEFAULT_WEIGHTS, DIMENSION_META } from "./config";
import type {
  DimensionId,
  DimensionValue,
  InteractionEffect,
  PriorityComponent,
  PriorityResult,
} from "./types";
import { round } from "./utils";

/**
 * CIVIC ACTION PRIORITY (0–100)
 *
 * A deterministic, explainable score. It is NOT an official AQI, a
 * medical-risk score, a government warning or a validated prediction.
 *
 *   base  = Σ (w_i / Σw) * value_i   over applicable dimensions that
 *           have valid data (weights renormalised; missing data are
 *           never treated as zero)
 *   score = min(100, base + Σ triggered interaction bonuses)
 *
 * If no applicable dimension has valid data, score is null and the UI
 * must show "insufficient data" rather than a fabricated zero.
 */

export type Weights = Record<DimensionId, number>;

export interface PriorityInput {
  /** dimensions with valid data (id → value). Absent = missing. */
  dimensions: Partial<Record<DimensionId, DimensionValue>>;
  /** dimensions relevant to this action / context */
  applicable: DimensionId[];
  /** pre-evaluated interaction rules */
  interactions: InteractionEffect[];
}

export function computePriority(
  input: PriorityInput,
  weights: Weights = DEFAULT_WEIGHTS
): PriorityResult {
  const applicable = [...new Set(input.applicable)];
  const present = applicable.filter((d) => input.dimensions[d] !== undefined);
  const missing = applicable.filter((d) => input.dimensions[d] === undefined);

  const totalWeight = present.reduce((s, d) => s + weights[d], 0);

  if (present.length === 0 || totalWeight <= 0) {
    return {
      score: null,
      base: 0,
      bonus: 0,
      components: [],
      missing,
      interactions: input.interactions,
      renormalized: missing.length > 0,
      note:
        "Insufficient data: no applicable environmental dimension has a valid value. Showing no score rather than a fabricated one.",
    };
  }

  const components: PriorityComponent[] = present.map((d) => {
    const dv = input.dimensions[d]!;
    const normalizedWeight = weights[d] / totalWeight;
    return {
      dimension: d,
      label: DIMENSION_META[d].label,
      value: round(dv.value, 1),
      weight: weights[d],
      normalizedWeight: round(normalizedWeight, 4),
      contribution: round(normalizedWeight * dv.value, 1),
      source: dv.source,
      timestamp: dv.timestamp,
    };
  });

  const base = round(components.reduce((s, c) => s + c.contribution, 0), 1);
  const bonus = round(
    input.interactions.filter((i) => i.triggered).reduce((s, i) => s + i.bonus, 0),
    1
  );
  const score = round(Math.min(100, base + bonus), 1);

  return {
    score,
    base,
    bonus,
    components,
    missing,
    interactions: input.interactions,
    renormalized: missing.length > 0,
    note:
      missing.length > 0
        ? `Weights renormalised over available dimensions (missing: ${missing.join(", ")}).`
        : "All applicable dimensions available.",
  };
}
