import { describe, expect, it } from "vitest";
import {
  assertValidTransition,
  incidentCreateSchema,
  incidentUpdateSchema,
  trackFor,
} from "@/lib/schemas";

const valid = {
  category: "open_burning",
  title: "Open waste burning near market",
  description: "Smoke and fire from a waste pile since this morning.",
  latitude: 28.6519,
  longitude: 77.1907,
  locationLabel: "Karol Bagh, Delhi",
  severity: 4,
  evidenceType: "citizen",
  sourceName: "Citizen report (this form)",
  confidence: "medium",
  isDemo: false,
};

describe("incident create validation", () => {
  it("accepts a valid payload and derives the track", () => {
    const res = incidentCreateSchema.safeParse(valid);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(trackFor(res.data.category)).toBe("waste");
      expect(res.data.isDemo).toBe(false);
    }
  });

  it("rejects an empty/too-short description", () => {
    const res = incidentCreateSchema.safeParse({ ...valid, description: "short" });
    expect(res.success).toBe(false);
  });

  it("rejects an empty title", () => {
    const res = incidentCreateSchema.safeParse({ ...valid, title: "  " });
    expect(res.success).toBe(false);
  });

  it("rejects out-of-range coordinates", () => {
    expect(incidentCreateSchema.safeParse({ ...valid, latitude: 91 }).success).toBe(false);
    expect(incidentCreateSchema.safeParse({ ...valid, longitude: -181 }).success).toBe(false);
    expect(
      incidentCreateSchema.safeParse({ ...valid, latitude: Number.NaN }).success
    ).toBe(false);
  });

  it("rejects invalid severity and category", () => {
    expect(incidentCreateSchema.safeParse({ ...valid, severity: 7 }).success).toBe(false);
    expect(incidentCreateSchema.safeParse({ ...valid, category: "nuke" }).success).toBe(false);
  });

  it("rejects unknown evidence types and confidence", () => {
    expect(
      incidentCreateSchema.safeParse({ ...valid, evidenceType: "vibes" }).success
    ).toBe(false);
    expect(
      incidentCreateSchema.safeParse({ ...valid, confidence: "sure-ish" }).success
    ).toBe(false);
  });
});

describe("incident update validation", () => {
  it("requires a rejection reason when rejecting", () => {
    expect(incidentUpdateSchema.safeParse({ status: "rejected" }).success).toBe(false);
    expect(
      incidentUpdateSchema.safeParse({ status: "rejected", rejectReason: "dupe report" }).success
    ).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(incidentUpdateSchema.safeParse({ status: "done" }).success).toBe(false);
  });
});

describe("status transitions", () => {
  it("allows the documented lifecycle", () => {
    expect(assertValidTransition("reported", "reviewed")).toBeNull();
    expect(assertValidTransition("reviewed", "assigned")).toBeNull();
    expect(assertValidTransition("assigned", "resolved")).toBeNull();
    expect(assertValidTransition("reported", "rejected")).toBeNull();
  });

  it("blocks impossible jumps", () => {
    expect(assertValidTransition("reported", "resolved")).not.toBeNull();
    expect(assertValidTransition("resolved", "reported")).not.toBeNull();
    expect(assertValidTransition("rejected", "resolved")).not.toBeNull();
  });
});
