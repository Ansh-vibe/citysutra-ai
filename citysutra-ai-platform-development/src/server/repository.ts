import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { actionLedger, incidents } from "@/db/schema";
import { makeDemoIncidents } from "@/lib/demoData";
import { trackFor } from "@/lib/schemas";
import type { IncidentCreateInput } from "@/lib/schemas";
import type { ActionStatus, Incident, IncidentStatus } from "@/lib/types";

/**
 * Data repository abstraction.
 *
 *  1. LocalPostgresRepository — demo/local fallback persistence.
 *  2. DynamoRepository        — persistent AWS implementation, active when
 *     REPO_MODE=dynamodb and DYNAMO_TABLE are set (deployed via aws/).
 *
 * The map and dashboard never depend on this repository for public
 * weather/air data — provider failures degrade gracefully either way.
 */

export interface IncidentRepository {
  readonly mode: "local-postgres" | "dynamodb";
  listIncidents(f?: {
    track?: string;
    status?: string;
    q?: string;
    limit?: number;
  }): Promise<Incident[]>;
  getIncident(id: string): Promise<Incident | null>;
  createIncident(input: IncidentCreateInput): Promise<Incident>;
  updateIncidentStatus(
    id: string,
    status: IncidentStatus,
    rejectReason?: string
  ): Promise<Incident>;
  countIncidents(): Promise<number>;
  ensureSeeded(): Promise<void>;
  resetDemo(): Promise<{ seeded: number }>;
  listActionStatuses(): Promise<Record<string, ActionStatus>>;
  upsertActionStatus(actionId: string, status: ActionStatus): Promise<void>;
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.floor(
    Math.random() * 46656
  ).toString(36).padStart(3, "0")}`;
}

/* ------------------------- local postgres repo --------------------------- */

class LocalPostgresRepository implements IncidentRepository {
  readonly mode = "local-postgres" as const;
  private seedChecked = false;

  private toRow(i: Incident) {
    return {
      id: i.incidentId,
      category: i.category,
      track: i.track,
      title: i.title,
      description: i.description,
      latitude: i.latitude,
      longitude: i.longitude,
      locationLabel: i.locationLabel,
      wardId: i.wardId ?? null,
      severity: i.severity,
      status: i.status,
      evidenceType: i.evidenceType,
      sourceName: i.sourceName,
      confidence: i.confidence,
      photoRef: i.photoRef ?? null,
      isDemo: i.isDemo,
      rejectReason: i.rejectReason ?? null,
      createdAt: new Date(i.createdAt),
      updatedAt: new Date(i.updatedAt),
    };
  }

  private toDomain(r: typeof incidents.$inferSelect): Incident {
    return {
      incidentId: r.id,
      category: r.category as Incident["category"],
      track: r.track as Incident["track"],
      title: r.title,
      description: r.description,
      latitude: r.latitude,
      longitude: r.longitude,
      locationLabel: r.locationLabel,
      wardId: r.wardId ?? undefined,
      severity: r.severity as Incident["severity"],
      status: r.status as Incident["status"],
      evidenceType: r.evidenceType as Incident["evidenceType"],
      sourceName: r.sourceName,
      confidence: r.confidence as Incident["confidence"],
      photoRef: r.photoRef ?? undefined,
      isDemo: r.isDemo,
      rejectReason: r.rejectReason ?? undefined,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async listIncidents(f?: {
    track?: string;
    status?: string;
    q?: string;
    limit?: number;
  }) {
    const rows = await db
      .select()
      .from(incidents)
      .where(
        f?.track
          ? sql`1=1 AND ${incidents.track} = ${f.track}`
          : f?.status
            ? sql`1=1 AND ${incidents.status} = ${f.status}`
            : undefined
      )
      .orderBy(sql`${incidents.createdAt} DESC`)
      .limit(f?.limit ?? 100);
    let out = rows.map((r) => this.toDomain(r));
    if (f?.q) {
      const q = f.q.toLowerCase();
      out = out.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.locationLabel.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q)
      );
    }
    return out;
  }

  async getIncident(id: string) {
    const rows = await db.select().from(incidents).where(eq(incidents.id, id)).limit(1);
    return rows[0] ? this.toDomain(rows[0]) : null;
  }

  async createIncident(input: IncidentCreateInput) {
    const now = new Date().toISOString();
    const incident: Incident = {
      incidentId: newId("inc"),
      category: input.category,
      track: trackFor(input.category),
      title: input.title,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      locationLabel: input.locationLabel,
      wardId: input.wardId,
      severity: input.severity,
      status: "reported",
      evidenceType: input.evidenceType,
      sourceName: input.sourceName,
      confidence: input.confidence,
      isDemo: input.isDemo,
      photoRef: input.photoRef,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(incidents).values(this.toRow(incident));
    return incident;
  }

  async updateIncidentStatus(id: string, status: IncidentStatus, rejectReason?: string) {
    const now = new Date();
    const updated = await db
      .update(incidents)
      .set({ status, rejectReason: rejectReason ?? null, updatedAt: now })
      .where(eq(incidents.id, id))
      .returning();
    if (updated.length === 0) throw new Error("not_found");
    return this.toDomain(updated[0]);
  }

  async countIncidents() {
    const rows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(incidents);
    return rows[0]?.n ?? 0;
  }

  async ensureSeeded() {
    if (this.seedChecked) return;
    const n = await this.countIncidents();
    if (n === 0) {
      const demo = makeDemoIncidents(new Date());
      await db.insert(incidents).values(demo.map((d) => this.toRow(d)));
    }
    this.seedChecked = true;
  }

  async resetDemo() {
    await db.delete(incidents);
    await db.delete(actionLedger);
    const demo = makeDemoIncidents(new Date());
    await db.insert(incidents).values(demo.map((d) => this.toRow(d)));
    this.seedChecked = true;
    return { seeded: demo.length };
  }

  async listActionStatuses() {
    const rows = await db.select().from(actionLedger);
    const out: Record<string, ActionStatus> = {};
    for (const r of rows) out[r.actionId] = r.status as ActionStatus;
    return out;
  }

  async upsertActionStatus(actionId: string, status: ActionStatus) {
    const now = new Date();
    await db
      .insert(actionLedger)
      .values({
        actionId,
        ruleId: "unknown",
        title: "",
        status,
        priorityScore: null,
        detail: {},
        generatedAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: actionLedger.actionId,
        set: { status, updatedAt: now },
      });
  }
}

/* --------------------------- dynamo repository --------------------------- */
/*
 * Single-table design (matches aws/template.yaml):
 *   PK = "INC#<incidentId>" | "ACT#<actionId>", SK = "item"
 *   GSI statusIndex (status) for status filtering.
 * The full domain object is stored as JSON in `payload`.
 */
type LooseAttr = { S?: string; N?: string; BOOL?: boolean };
const loose = (v: unknown): LooseAttr => (v as LooseAttr) ?? {};

class DynamoRepository implements IncidentRepository {
  readonly mode = "dynamodb" as const;
  private client: DynamoDBClient;
  private table: string;
  private seedChecked = false;

  constructor() {
    const table = process.env.DYNAMO_TABLE;
    if (!table) throw new Error("DYNAMO_TABLE is not set");
    this.table = table;
    this.client = new DynamoDBClient({
      region: process.env.AWS_REGION || "ap-south-1",
    });
  }

  private putItem(item: Record<string, unknown>): Promise<unknown> {
    return this.client.send(new PutItemCommand({ TableName: this.table, Item: marshall(item) }));
  }

  private incidentsFromScan(items: Record<string, unknown>[]): Incident[] {
    return items
      .filter((i) => (loose(i.pk).S ?? "").startsWith("INC#"))
      .map((i) => {
        const p = loose(i.payload).S;
        return p ? (JSON.parse(p) as Incident) : null;
      })
      .filter((p): p is Incident => p !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async listIncidents(f?: {
    track?: string;
    status?: string;
    q?: string;
    limit?: number;
  }) {
    let out: Incident[];
    if (f?.status) {
      const res = await this.client.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: "statusIndex",
          KeyConditionExpression: "status = :s",
          ExpressionAttributeValues: marshall({ s: f.status }),
        })
      );
      out = this.incidentsFromScan(res.Items ?? []);
    } else {
      const res = await this.client.send(new ScanCommand({ TableName: this.table }));
      out = this.incidentsFromScan(res.Items ?? []);
    }
    if (f?.track) out = out.filter((i) => i.track === f.track);
    if (f?.q) {
      const q = f.q.toLowerCase();
      out = out.filter(
        (i) => i.title.toLowerCase().includes(q) || i.locationLabel.toLowerCase().includes(q)
      );
    }
    return out.slice(0, f?.limit ?? 100);
  }

  async getIncident(id: string) {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.table,
        Key: marshall({ pk: `INC#${id}`, sk: "item" }),
      })
    );
    if (!res.Item) return null;
    const u = unmarshall(res.Item);
    const p = typeof u.payload === "string" ? JSON.parse(u.payload) : null;
    return (p as Incident) ?? null;
  }

  async createIncident(input: IncidentCreateInput) {
    const now = new Date().toISOString();
    const incident: Incident = {
      incidentId: newId("inc"),
      category: input.category,
      track: trackFor(input.category),
      title: input.title,
      description: input.description,
      latitude: input.latitude,
      longitude: input.longitude,
      locationLabel: input.locationLabel,
      wardId: input.wardId,
      severity: input.severity,
      status: "reported",
      evidenceType: input.evidenceType,
      sourceName: input.sourceName,
      confidence: input.confidence,
      isDemo: input.isDemo,
      photoRef: input.photoRef,
      createdAt: now,
      updatedAt: now,
    };
    await this.putItem({
      pk: `INC#${incident.incidentId}`,
      sk: "item",
      status: incident.status,
      track: incident.track,
      createdAt: incident.createdAt,
      payload: JSON.stringify(incident),
    });
    return incident;
  }

  async updateIncidentStatus(id: string, status: IncidentStatus, rejectReason?: string) {
    const cur = await this.getIncident(id);
    if (!cur) throw new Error("not_found");
    const next: Incident = { ...cur, status, rejectReason, updatedAt: new Date().toISOString() };
    await this.putItem({
      pk: `INC#${id}`,
      sk: "item",
      status: next.status,
      track: next.track,
      createdAt: next.createdAt,
      payload: JSON.stringify(next),
    });
    return next;
  }

  async countIncidents() {
    const res = await this.client.send(new ScanCommand({ TableName: this.table }));
    return (res.Items ?? []).filter((i) => (loose(i.pk).S ?? "").startsWith("INC#")).length;
  }

  async ensureSeeded() {
    if (this.seedChecked) return;
    const n = await this.countIncidents();
    if (n === 0) {
      for (const d of makeDemoIncidents(new Date())) {
        await this.putItem({
          pk: `INC#${d.incidentId}`,
          sk: "item",
          status: d.status,
          track: d.track,
          createdAt: d.createdAt,
          payload: JSON.stringify(d),
        });
      }
    }
    this.seedChecked = true;
  }

  async resetDemo() {
    const res = await this.client.send(new ScanCommand({ TableName: this.table }));
    for (const item of res.Items ?? []) {
      await this.client.send(
        new DeleteItemCommand({
          TableName: this.table,
          Key: marshall({ pk: loose(item.pk).S ?? "", sk: loose(item.sk).S ?? "item" }),
        })
      );
    }
    const demo = makeDemoIncidents(new Date());
    for (const d of demo) {
      await this.putItem({
        pk: `INC#${d.incidentId}`,
        sk: "item",
        status: d.status,
        track: d.track,
        createdAt: d.createdAt,
        payload: JSON.stringify(d),
      });
    }
    this.seedChecked = true;
    return { seeded: demo.length };
  }

  async listActionStatuses() {
    const res = await this.client.send(new ScanCommand({ TableName: this.table }));
    const out: Record<string, ActionStatus> = {};
    for (const item of res.Items ?? []) {
      const pk = loose(item.pk).S ?? "";
      if (!pk.startsWith("ACT#")) continue;
      const p = loose(item.payload).S;
      if (!p) continue;
      const u = JSON.parse(p) as { actionId?: string; status?: string };
      if (u.actionId && u.status) {
        out[u.actionId] = u.status as ActionStatus;
      }
    }
    return out;
  }

  async upsertActionStatus(actionId: string, status: ActionStatus) {
    const now = new Date().toISOString();
    await this.putItem({
      pk: `ACT#${actionId}`,
      sk: "item",
      createdAt: now,
      payload: JSON.stringify({ actionId, status, generatedAt: now }),
    });
  }
}

/* ------------------------------ selection -------------------------------- */

let localRepo: LocalPostgresRepository | null = null;
let dynamoRepo: DynamoRepository | null = null;

export function getRepository(): IncidentRepository {
  if (process.env.REPO_MODE === "dynamodb" && process.env.DYNAMO_TABLE) {
    if (!dynamoRepo) dynamoRepo = new DynamoRepository();
    return dynamoRepo;
  }
  if (!localRepo) localRepo = new LocalPostgresRepository();
  return localRepo;
}
