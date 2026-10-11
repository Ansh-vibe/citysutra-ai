import { describe, expect, it } from "vitest";
import { computePriority } from "@/lib/priority";
import { DEFAULT_WEIGHTS } from "@/lib/config";
import type { DimensionValue, InteractionEffect } from "@/lib/types";

function dim(id: DimensionValue["id"], value: number): DimensionValue {
  return {
    id,
    value,
    source: "test",
    timestamp: "2026-01-01T00:00:00.000Z",
    raw: { label: "test", value, unit: "idx" },
    note: "unit test",
    status: "live",
  };
}

const noFx: InteractionEffect[] = [];
const all = ["A", "H", "W", "G"] as const;

describe("Civic Action Priority", () => {
  it("computes the weighted base score (default weights A30 H25 W20 G25)", () => {
    const r = computePriority({
      dimensions: { A: dim("A", 100), H: dim("H", 0), W: dim("W", 0), G: dim("G", 0) },
      applicable: [...all],
      interactions: noFx,
    });
    expect(r.score).toBeCloseTo(30, 5);
    expect(r.base).toBeCloseTo(30, 5);
    expect(r.bonus).toBe(0);
    expect(r.missing).toEqual([]);
    expect(r.renormalized).toBe(false);
  });

  it("averages proportionally with mixed values", () => {
    const r = computePriority({
      dimensions: { A: dim("A", 80), H: dim("H", 60), W: dim("W", 40), G: dim("G", 20) },
      applicable: [...all],
      interactions: noFx,
    });
    // 0.3*80 + 0.25*60 + 0.2*40 + 0.25*20 = 24 + 15 + 8 + 5 = 52
    expect(r.score).toBeCloseTo(52, 5);
  });

  it("renormalizes weights when a dimension is missing (never treats missing as zero)", () => {
    // A missing; H=100, W=100, G=100 → base must be exactly 100
    const r = computePriority({
      dimensions: { H: dim("H", 100), W: dim("W", 100), G: dim("G", 100) },
      applicable: [...all],
      interactions: noFx,
    });
    expect(r.score).toBeCloseTo(100, 5);
    expect(r.missing).toEqual(["A"]);
    expect(r.renormalized).toBe(true);

    // A missing; only G=100 → 0.25 / (0.25) ... applicable A,G → 1.0 * 100? No:
    // present = [G], totalWeight = 0.25 → normalized 1.0 → base 100.
    const r2 = computePriority({
      dimensions: { G: dim("G", 100) },
      applicable: ["A", "G"],
      interactions: noFx,
    });
    expect(r2.score).toBeCloseTo(100, 5);
    expect(r2.missing).toEqual(["A"]);

    // H missing out of H,G: 0.25/(0.25+0.25)=0.5 each → 0.5*50 + 0.5*100 = 75
    const r3 = computePriority({
      dimensions: { G: dim("G", 100) },
      applicable: ["H", "G"],
      interactions: noFx,
    });
    expect(r3.score).toBeCloseTo(100, 5);
    const r4 = computePriority({
      dimensions: { H: dim("H", 50), G: dim("G", 100) },
      applicable: ["H", "G"],
      interactions: noFx,
    });
    expect(r4.score).toBeCloseTo(75, 5);
  });

  it("returns null (insufficient data) instead of a fabricated zero", () => {
    const r = computePriority({
      dimensions: {},
      applicable: [...all],
      interactions: noFx,
    });
    expect(r.score).toBeNull();
    expect(r.missing).toEqual([...all]);
  });

  it("respects a dimension being applicable but absent for this action", () => {
    // Action only cares about A; H/W/G present but out of scope.
    const r = computePriority({
      dimensions: { A: dim("A", 55) },
      applicable: ["A"],
      interactions: noFx,
    });
    expect(r.score).toBeCloseTo(55, 5);
    expect(r.missing).toEqual([]);
  });

  it("adds triggered interaction bonuses and caps at 100", () => {
    const fx: InteractionEffect[] = [
      { ruleId: "R-01", label: "x", bonus: 10, triggered: true, evidence: [] },
      { ruleId: "R-03", label: "y", bonus: 8, triggered: true, evidence: [] },
      { ruleId: "R-02", label: "z", bonus: 10, triggered: false, evidence: [] },
    ];
    const r = computePriority({
      dimensions: { A: dim("A", 90), H: dim("H", 90), W: dim("W", 90), G: dim("G", 90) },
      applicable: [...all],
      interactions: fx,
    });
    // base 90 + bonus 18 → 108 → capped 100
    expect(r.base).toBeCloseTo(90, 5);
    expect(r.bonus).toBe(18);
    expect(r.score).toBe(100);
  });

  it("is deterministic: identical inputs produce identical outputs", () => {
    const input = {
      dimensions: { A: dim("A", 77), W: dim("W", 33) } as const,
      applicable: ["A", "W", "G"] as const,
      interactions: [
        { ruleId: "R-01", label: "x", bonus: 10, triggered: true, evidence: ["e"] },
      ],
    };
    const a = computePriority(input as never);
    const b = computePriority(input as never);
    expect(a).toEqual(b);
  });

  it("supports custom weights", () => {
    const r = computePriority(
      {
        dimensions: { A: dim("A", 100), G: dim("G", 0) },
        applicable: ["A", "G"],
        interactions: noFx,
      },
      { ...DEFAULT_WEIGHTS, A: 0.5, G: 0.5 }
    );
    expect(r.score).toBeCloseTo(50, 5);
  });
});
