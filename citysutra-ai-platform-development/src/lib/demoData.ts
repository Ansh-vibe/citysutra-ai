import type { Incident } from "./types";

/**
 * Reproducible demo scenario — every record is explicitly flagged
 * isDemo: true and rendered with a DEMO badge in the UI.
 *
 * Scenario: elevated (simulated) air signal + a reported open-burning
 * incident, hot conditions, and a separate blocked-drain + water-leak
 * pair. Coordinates are approximate neighborhood locations in Delhi.
 */

export const SIMULATED_US_AQI = 132;

const min = (m: number) => m * 60 * 1000;

export function makeDemoIncidents(now: Date): Incident[] {
  const iso = (offsetMin: number) => new Date(now.getTime() - offsetMin).toISOString();
  const base = {
    isDemo: true,
    sourceName: "CitySutra demo seed",
  } as const;

  return [
    {
      ...base,
      incidentId: "demo-open-burning-kb",
      category: "open_burning",
      track: "waste",
      title: "Open waste burning (demo)",
      description:
        "Simulated demo report: fire and smoke from a waste pile near the market lane. Seed record for the demo scenario — not a detected hotspot.",
      latitude: 28.6519,
      longitude: 77.1907,
      locationLabel: "Karol Bagh, Delhi",
      wardId: "demo-ward-01",
      severity: 4,
      status: "reported",
      evidenceType: "citizen",
      confidence: "medium",
      createdAt: iso(180),
      updatedAt: iso(180),
    },
    {
      ...base,
      incidentId: "demo-smoke-cp",
      category: "smoke_observation",
      track: "air",
      title: "Unexplained smoke plume (demo)",
      description:
        "Simulated demo report: resident noticed an unexplained smoke plume in the evening. Location approximate.",
      latitude: 28.6541,
      longitude: 77.1885,
      locationLabel: "Karol Bagh edge, Delhi",
      severity: 3,
      status: "reported",
      evidenceType: "citizen",
      confidence: "low",
      createdAt: iso(120),
      updatedAt: iso(120),
    },
    {
      ...base,
      incidentId: "demo-blocked-drain-ln",
      category: "blocked_drain",
      track: "heatwater",
      title: "Blocked open drain (demo)",
      description:
        "Simulated demo report: open drain backing up with silt; low-lying shops nearby. Seed record for the drain + rain rule.",
      latitude: 28.5677,
      longitude: 77.2433,
      locationLabel: "Lajpat Nagar, Delhi",
      severity: 3,
      status: "reported",
      evidenceType: "citizen",
      confidence: "medium",
      createdAt: iso(300),
      updatedAt: iso(300),
    },
    {
      ...base,
      incidentId: "demo-water-leak-dwarka",
      category: "water_leak",
      track: "heatwater",
      title: "Water main leak (demo)",
      description:
        "Simulated demo report: steady leaking pipe at a road corner, small puddle growing through the day.",
      latitude: 28.5921,
      longitude: 77.046,
      locationLabel: "Dwarka Sector 12, Delhi",
      severity: 3,
      status: "reviewed",
      evidenceType: "citizen",
      confidence: "medium",
      createdAt: iso(480),
      updatedAt: iso(240),
    },
    {
      ...base,
      incidentId: "demo-overflow-shahdara",
      category: "overflowing_bin",
      track: "waste",
      title: "Overflowing community bin (demo)",
      description:
        "Simulated demo report: community bin overflowing onto the footpath since last night.",
      latitude: 28.6599,
      longitude: 77.3062,
      locationLabel: "Shahdara, Delhi",
      severity: 2,
      status: "reported",
      evidenceType: "citizen",
      confidence: "low",
      createdAt: iso(360),
      updatedAt: iso(360),
    },
    {
      ...base,
      incidentId: "demo-missed-collection-east",
      category: "missed_collection",
      track: "waste",
      title: "Missed door-to-door collection (demo)",
      description:
        "Simulated demo report: scheduled collection skipped for two consecutive days in the lane.",
      latitude: 28.7411,
      longitude: 77.2238,
      locationLabel: "East Delhi (Vinod Nagar), Delhi",
      severity: 2,
      status: "assigned",
      evidenceType: "citizen",
      confidence: "medium",
      createdAt: iso(1560),
      updatedAt: iso(720),
    },
    {
      ...base,
      incidentId: "demo-recovery-cp",
      category: "recovery_opportunity",
      track: "waste",
      title: "Recyclables recovery opportunity (demo)",
      description:
        "Simulated demo record: consistent cardboard/plastic stream from shops near the central market — candidate for aggregator pickup.",
      latitude: 28.6315,
      longitude: 77.2167,
      locationLabel: "Connaught Place, Delhi",
      severity: 1,
      status: "reported",
      evidenceType: "simulated",
      confidence: "low",
      createdAt: iso(600),
      updatedAt: iso(600),
    },
    {
      ...base,
      incidentId: "demo-waterlogging-np",
      category: "waterlogging",
      track: "heatwater",
      title: "Waterlogging after shower (demo, resolved)",
      description:
        "Simulated demo report, already resolved: road waterlogging that cleared after manual de-silting. Kept to demonstrate the full lifecycle.",
      latitude: 28.5768,
      longitude: 77.2496,
      locationLabel: "Nehru Place, Delhi",
      severity: 3,
      status: "resolved",
      evidenceType: "citizen",
      confidence: "medium",
      createdAt: iso(1800),
      updatedAt: iso(900),
    },
  ];
}
