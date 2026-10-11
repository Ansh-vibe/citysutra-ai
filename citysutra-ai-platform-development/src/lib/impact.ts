/**
 * Impact Studio — scenario calculator (pure functions, unit-tested).
 * Every result shows its formula, units, inputs, assumptions and a
 * ±25 % sensitivity band on the primary driving input.
 * All outputs are ESTIMATES / SCENARIOS — never measured outcomes.
 */

export interface ImpactInputs {
  wasteTonnesDay: number | null;
  organicFractionPct: number | null; // 0–100
  diversionFractionPct: number | null; // 0–100
  collectionKmDay: number | null;
  routeReductionPct: number | null; // 0–100
  waterLeakLitresDay: number | null;
  waterRatePerKl: number | null; // ₹ / kL
  co2ePerTonneOrganic: number | null; // t CO2e / t organic diverted
  co2ePerKm: number | null; // kg CO2e / collection-km
  biogasKwhPerTonne: number | null; // optional scenario
}

export interface ImpactResult {
  key: string;
  title: string;
  value: number | null;
  unit: string;
  formula: string;
  inputs: string[];
  assumptions: string[];
  insufficient: string | null;
  sensitivity: { low: number; base: number; high: number } | null;
}

export interface ImpactOutput {
  results: ImpactResult[];
  notes: string[];
}

const ok = (v: number | null): v is number =>
  v !== null && Number.isFinite(v) && v > 0;

function sensitivity(
  base: number,
  f: (mult: number) => number
): { low: number; base: number; high: number } {
  return { low: f(0.75), base, high: f(1.25) };
}

export function computeImpact(inp: ImpactInputs): ImpactOutput {
  const results: ImpactResult[] = [];
  const notes: string[] = [];
  const EST = "estimate (scenario, not a measured outcome)";

  /* 1 — organic waste diverted (t/day) */
  const organicT =
    ok(inp.wasteTonnesDay) && ok(inp.organicFractionPct) && ok(inp.diversionFractionPct)
      ? inp.wasteTonnesDay! * (inp.organicFractionPct! / 100) * (inp.diversionFractionPct! / 100)
      : null;
  results.push({
    key: "organic_diverted",
    title: "Organic waste diverted",
    value: organicT,
    unit: "t/day",
    formula: "waste (t/d) × organic fraction × diversion fraction",
    inputs: [
      `waste = ${inp.wasteTonnesDay ?? "—"} t/d`,
      `organic = ${inp.organicFractionPct ?? "—"} %`,
      `diverted = ${inp.diversionFractionPct ?? "—"} %`,
    ],
    assumptions: ["Fractions are user-entered estimates, not lab analyses."],
    insufficient: organicT === null ? "Requires waste tonnage, organic fraction and diversion fraction (all > 0)." : null,
    sensitivity:
      organicT === null
        ? null
        : sensitivity(organicT, (m) => organicT * m),
  });

  /* 2 — avoided emissions from diversion (t CO2e/year) */
  const co2e =
    organicT !== null && ok(inp.co2ePerTonneOrganic)
      ? organicT * inp.co2ePerTonneOrganic! * 365
      : null;
  results.push({
    key: "co2e_avoided",
    title: "Avoided emissions (diversion)",
    value: co2e,
    unit: "t CO2e/year",
    formula: "organic diverted (t/d) × factor (t CO2e/t) × 365 d",
    inputs: [
      `organic diverted = ${organicT === null ? "—" : organicT.toFixed(2)} t/d`,
      `factor = ${inp.co2ePerTonneOrganic ?? "—"} t CO2e/t`,
    ],
    assumptions: [
      "Diversion replaces unmanaged disposal with uncaptured CH4 (simplified IPCC-style default, user-editable).",
      "Factor is illustrative — verify against a local GHG protocol before publication.",
    ],
    insufficient:
      co2e === null
        ? organicT === null
          ? "Requires organic diversion (t/d) plus the CO2e factor."
          : "Enter the CO2e-per-tonne factor (default provided on the form)."
        : null,
    sensitivity:
      co2e === null
        ? null
        : sensitivity(co2e, (m) => co2e * m),
  });

  /* 3 — collection-route savings (kg CO2e/year) */
  const route =
    ok(inp.collectionKmDay) && ok(inp.routeReductionPct) && ok(inp.co2ePerKm)
      ? inp.collectionKmDay! * (inp.routeReductionPct! / 100) * inp.co2ePerKm! * 365
      : null;
  results.push({
    key: "route_savings",
    title: "Collection-route savings",
    value: route,
    unit: "kg CO2e/year",
    formula: "route km (d) × route reduction × factor (kg/km) × 365 d",
    inputs: [
      `route = ${inp.collectionKmDay ?? "—"} km/d`,
      `reduction = ${inp.routeReductionPct ?? "—"} %`,
      `factor = ${inp.co2ePerKm ?? "—"} kg/km`,
    ],
    assumptions: [
      "One small collection truck, loaded + return, user-editable factor.",
      "Route reduction is a planning scenario, not an observed change.",
    ],
    insufficient:
      route === null ? "Requires daily route km, route reduction % and the per-km factor (all > 0)." : null,
    sensitivity:
      route === null
        ? null
        : sensitivity(route, (m) => route * m),
  });

  /* 4 — optional scenario energy (MWh/year) */
  const energy =
    organicT !== null && ok(inp.biogasKwhPerTonne)
      ? (organicT * inp.biogasKwhPerTonne! * 365) / 1000
      : null;
  results.push({
    key: "energy",
    title: "Scenario energy recovery (biodigester)",
    value: energy,
    unit: "MWh/year",
    formula: "organic diverted (t/d) × kWh per t wet waste × 365 d ÷ 1000",
    inputs: [
      `organic diverted = ${organicT === null ? "—" : organicT.toFixed(2)} t/d`,
      `yield = ${inp.biogasKwhPerTonne ?? "—"} kWh/t`,
    ],
    assumptions: [
      "Optional scenario only — requires a functioning digester; not assumed by default.",
      "Yield is illustrative; real digester yields vary with C:N ratio and design.",
    ],
    insufficient:
      energy === null
        ? organicT === null
          ? "Requires organic diversion (t/d) and a biodigester yield (kWh/t)."
          : "Enter a biodigester yield (kWh/t) to include this optional scenario."
        : null,
    sensitivity:
      energy === null ? null : sensitivity(energy, (m) => energy * m),
  });

  /* 5 — water addressed by leak repair (kL/day, ₹/day) */
  const kld = ok(inp.waterLeakLitresDay) ? inp.waterLeakLitresDay! / 1000 : null;
  const inr = kld !== null && ok(inp.waterRatePerKl) ? kld * inp.waterRatePerKl! : null;
  results.push({
    key: "water",
    title: "Water loss addressed",
    value: kld,
    unit: "kL/day",
    formula: "leak flow (L/d) ÷ 1000 → kL/d; value = kL/d × tariff (₹/kL)",
    inputs: [
      `leak = ${inp.waterLeakLitresDay ?? "—"} L/d`,
      `tariff = ${inp.waterRatePerKl ?? "—"} ₹/kL`,
    ],
    assumptions: [
      "Leak flow is a field estimate; repair restores the full amount (no network losses).",
      `Monetary value = ${inr === null ? "n/a" : `₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 0 })}/day`}, using the entered tariff.`,
    ],
    insufficient: kld === null ? "Requires an estimated leak flow in litres/day." : null,
    sensitivity:
      kld === null
        ? null
        : sensitivity(kld, (m) => kld * m),
  });

  notes.push(
    `All results are ${EST}.`,
    "Changing any input recomputes every dependent result; sensitivity bands show ±25 % on the primary driving input.",
  );

  return { results, notes };
}

export const EMPTY_IMPACT: ImpactInputs = {
  wasteTonnesDay: null,
  organicFractionPct: null,
  diversionFractionPct: null,
  collectionKmDay: null,
  routeReductionPct: null,
  waterLeakLitresDay: null,
  waterRatePerKl: null,
  co2ePerTonneOrganic: null,
  co2ePerKm: null,
  biogasKwhPerTonne: null,
};
