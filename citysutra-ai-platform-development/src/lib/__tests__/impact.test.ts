import { describe, expect, it } from "vitest";
import { computeImpact, EMPTY_IMPACT } from "@/lib/impact";

const full = {
  wasteTonnesDay: 2.5,
  organicFractionPct: 45,
  diversionFractionPct: 60,
  collectionKmDay: 42,
  routeReductionPct: 20,
  waterLeakLitresDay: 50000,
  waterRatePerKl: 65,
  co2ePerTonneOrganic: 0.0545,
  co2ePerKm: 0.35,
  biogasKwhPerTonne: null,
};

const byKey = (out: ReturnType<typeof computeImpact>) =>
  Object.fromEntries(out.results.map((r) => [r.key, r]));

describe("impact calculator", () => {
  it("computes organic diversion, avoided CO2e, route savings and water", () => {
    const out = computeImpact(full);
    const r = byKey(out);

    // 2.5 * 0.45 * 0.6 = 0.675 t/d
    expect(r.organic_diverted.value).toBeCloseTo(0.675, 6);
    // 0.675 * 0.0545 * 365 = 13.4411...
    expect(r.co2e_avoided.value).toBeCloseTo(0.675 * 0.0545 * 365, 4);
    // 42 * 0.20 * 0.35 * 365 = 1073.1
    expect(r.route_savings.value).toBeCloseTo(1073.1, 4);
    // 50000 L/d → 50 kL/d
    expect(r.water.value).toBeCloseTo(50, 6);
    // no biodigester yield → optional energy is insufficient, not zero
    expect(r.energy.value).toBeNull();
    expect(r.energy.insufficient).toBeTruthy();
  });

  it("shows insufficient data (never fake zeros) when inputs are missing", () => {
    const out = computeImpact(EMPTY_IMPACT);
    for (const r of out.results) {
      expect(r.value).toBeNull();
      expect(r.insufficient).toBeTruthy();
      expect(r.sensitivity).toBeNull();
    }
  });

  it("recomputes when inputs change", () => {
    const a = computeImpact(full);
    const b = computeImpact({ ...full, diversionFractionPct: 30 });
    const ra = byKey(a);
    const rb = byKey(b);
    expect(rb.organic_diverted.value).toBeCloseTo(0.3375, 6);
    expect(rb.organic_diverted.value).toBeCloseTo((ra.organic_diverted.value as number) / 2, 6);
  });

  it("includes a ±25% sensitivity band on the driving input", () => {
    const out = computeImpact(full);
    const r = byKey(out);
    const s = r.route_savings.sensitivity as { low: number; base: number; high: number };
    expect(s.base).toBeCloseTo(1073.1, 4);
    expect(s.low).toBeCloseTo(1073.1 * 0.75, 4);
    expect(s.high).toBeCloseTo(1073.1 * 1.25, 4);
  });

  it("adds the optional energy scenario when a yield is provided", () => {
    const out = computeImpact({ ...full, biogasKwhPerTonne: 100 });
    const r = byKey(out);
    // 0.675 t/d * 100 kWh/t * 365 / 1000 = 24.6375 MWh/y
    expect(r.energy.value).toBeCloseTo(24.6375, 4);
  });

  it("labels every formula and keeps units visible", () => {
    const out = computeImpact(full);
    for (const r of out.results) {
      expect(r.formula.length).toBeGreaterThan(5);
      expect(r.unit.length).toBeGreaterThan(0);
      expect(r.inputs.length).toBeGreaterThan(0);
      expect(r.assumptions.length).toBeGreaterThan(0);
    }
  });
});
