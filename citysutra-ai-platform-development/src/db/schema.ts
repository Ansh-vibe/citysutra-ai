import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * CitySutra AI local persistence (demo mode).
 * Mirrors the DynamoDB single-table design in aws/template.yaml so the
 * same domain model works in both repositories.
 */

export const incidents = pgTable(
  "incidents",
  {
    id: text("id").primaryKey(),
    category: text("category").notNull(),
    track: text("track").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    latitude: doublePrecision("latitude").notNull(),
    longitude: doublePrecision("longitude").notNull(),
    locationLabel: text("location_label").notNull(),
    wardId: text("ward_id"),
    severity: integer("severity").notNull(),
    status: text("status").notNull().default("reported"),
    evidenceType: text("evidence_type").notNull(),
    sourceName: text("source_name").notNull(),
    confidence: text("confidence").notNull(),
    photoRef: text("photo_ref"),
    isDemo: boolean("is_demo").notNull().default(false),
    rejectReason: text("reject_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [
    index("incidents_status_idx").on(t.status),
    index("incidents_track_idx").on(t.track),
    index("incidents_created_idx").on(t.createdAt),
  ]
);

/** Action ledger — persists operator decisions on generated actions. */
export const actionLedger = pgTable(
  "action_ledger",
  {
    actionId: text("action_id").primaryKey(),
    ruleId: text("rule_id").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull().default("open"),
    priorityScore: doublePrecision("priority_score"),
    detail: jsonb("detail").notNull().default({}),
    generatedAt: timestamp("generated_at", { withTimezone: true }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("actions_status_idx").on(t.status)]
);
