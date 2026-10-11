/**
 * CitySutra AI — standalone Lambda handler (API Gateway HTTP API proxy).
 *
 * Serverless data processing, risk analysis and event handling:
 *   GET   /health
 *   GET   /incidents?track=&status=&q=&limit=
 *   POST  /incidents
 *   GET   /incidents/{incidentId}
 *   PATCH /incidents/{incidentId}
 *   POST  /risk-snapshot   → computes risk indicators from stored incidents and
 *                            persists an ALERT record to DynamoDB
 *   POST  /evidence        → stores an evidence file (base64) in Amazon S3
 *
 * No secrets in code: table/bucket/origin come from environment variables;
 * AWS credentials come from the execution role (IAM), never from the bundle.
 * Errors are logged without incident payloads that may contain personal data.
 */
import {
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({});
const TABLE = process.env.DYNAMO_TABLE;
const S3_BUCKET = process.env.S3_BUCKET;
const ORIGIN = process.env.ALLOWED_ORIGIN || "";
const S3 = S3_BUCKET ? new (await import("@aws-sdk/client-s3")).S3Client({}) : null;

const CATEGORIES = new Set([
  "water_leak", "waterlogging", "blocked_drain", "flooding_risk",
  "heat_infrastructure", "cooling_resource_gap",
  "overflowing_bin", "missed_collection", "mixed_waste", "open_burning",
  "accumulated_waste", "drain_waste_blockage", "recovery_opportunity",
  "smoke_observation",
]);
const TRACKS = {
  water_leak: "heatwater", waterlogging: "heatwater", blocked_drain: "heatwater",
  flooding_risk: "heatwater", heat_infrastructure: "heatwater", cooling_resource_gap: "heatwater",
  overflowing_bin: "waste", missed_collection: "waste", mixed_waste: "waste",
  open_burning: "waste", accumulated_waste: "waste", drain_waste_blockage: "waste",
  recovery_opportunity: "waste", smoke_observation: "air",
};
const ACTIVE = new Set(["reported", "reviewed", "assigned"]);
const STATUS_FLOW = {
  reported: ["reviewed", "rejected"],
  reviewed: ["assigned", "reported", "rejected"],
  assigned: ["resolved", "reviewed"],
  resolved: ["assigned"],
  rejected: ["reported"],
};
const EVIDENCE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/heic", "text/plain",
]);
const MAX_EVIDENCE_BYTES = 1024 * 1024; // 1 MB

function json(status, body) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

function validateIncident(body) {
  const errs = [];
  if (!CATEGORIES.has(body?.category)) errs.push("category: unknown incident category");
  if (typeof body?.title !== "string" || body.title.trim().length < 3 || body.title.length > 120)
    errs.push("title: 3–120 characters required");
  if (typeof body?.description !== "string" || body.description.trim().length < 10 || body.description.length > 2000)
    errs.push("description: 10–2000 characters required");
  const lat = Number(body?.latitude);
  const lon = Number(body?.longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errs.push("latitude: must be -90..90");
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errs.push("longitude: must be -180..180");
  if (typeof body?.locationLabel !== "string" || body.locationLabel.trim().length < 2)
    errs.push("locationLabel: at least 2 characters");
  if (![1, 2, 3, 4, 5].includes(Number(body?.severity))) errs.push("severity: must be 1..5");
  if (!["citizen", "sensor", "official", "simulated"].includes(body?.evidenceType))
    errs.push("evidenceType: citizen|sensor|official|simulated");
  if (typeof body?.sourceName !== "string" || body.sourceName.trim().length < 2)
    errs.push("sourceName: at least 2 characters");
  if (!["low", "medium", "high"].includes(body?.confidence))
    errs.push("confidence: low|medium|high");
  return errs;
}

function incidentsFromScan(items) {
  return items
    .filter((i) => typeof i.pk === "string" && i.pk.startsWith("INC#"))
    .map((i) => {
      try {
        return typeof i.payload === "string" ? JSON.parse(i.payload) : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/* Deterministic server-side risk analysis from stored incidents.
   Mirrors the app's G (waste) dimension: Σ severity × 12, capped at 100. */
function computeRiskIndicators(incidents) {
  const active = incidents.filter((i) => ACTIVE.has(i.status));
  const byTrack = { air: 0, heatwater: 0, waste: 0 };
  for (const i of active) byTrack[i.track] = (byTrack[i.track] ?? 0) + 1;
  const wastePressure = Math.min(
    100,
    active.filter((i) => i.track === "waste").reduce((s, i) => s + i.severity * 12, 0)
  );
  const highestSeverity = active.reduce((m, i) => Math.max(m, i.severity), 0);
  const burningReports = active.filter(
    (i) => i.category === "open_burning" || i.category === "smoke_observation"
  ).length;
  return {
    activeTotal: active.length,
    activeByTrack: byTrack,
    wastePressure, // 0–100 (G dimension equivalent)
    highestActiveSeverity: highestSeverity,
    burningReports,
    demoShare: incidents.length
      ? Math.round((incidents.filter((i) => i.isDemo).length / incidents.length) * 100)
      : 0,
    riskBand:
      wastePressure >= 70 || burningReports >= 2
        ? "elevated"
        : wastePressure >= 40
          ? "moderate"
          : "low",
  };
}

async function handler(event) {
  try {
    if (!TABLE) return json(500, { ok: false, error: "DYNAMO_TABLE not configured" });
    const method = event.requestContext?.http?.method ?? event.httpMethod ?? "GET";
    const rawPath = event.rawPath || event.path || "/";
    const path = decodeURIComponent(rawPath).replace(/\/+$/, "") || "/";
    const url = new URL(rawPath, "http://x");

    if (event.isBase64Encoded && event.body) {
      event.body = Buffer.from(event.body, "base64").toString("utf8");
    }
    const body = event.body ? JSON.parse(event.body) : {};

    /* GET /health */
    if (method === "GET" && path === "/health") {
      return json(200, {
        ok: true,
        time: new Date().toISOString(),
        table: TABLE,
        s3: S3_BUCKET || null,
      });
    }

    /* GET /incidents */
    if (method === "GET" && path === "/incidents") {
      const track = url.searchParams.get("track");
      const status = url.searchParams.get("status");
      const q = url.searchParams.get("q");
      const limit = Math.min(200, Number(url.searchParams.get("limit") ?? 100) || 100);
      let items;
      if (status) {
        const res = await client.send(
          new QueryCommand({
            TableName: TABLE,
            IndexName: "statusIndex",
            KeyConditionExpression: "status = :s",
            ExpressionAttributeValues: marshall({ s: status }),
          })
        );
        items = res.Items ?? [];
      } else {
        const res = await client.send(new ScanCommand({ TableName: TABLE }));
        items = res.Items ?? [];
      }
      let out = incidentsFromScan(items.map((i) => unmarshall(i)));
      if (track) out = out.filter((i) => i.track === track);
      if (q) {
        const lq = q.toLowerCase();
        out = out.filter(
          (i) =>
            i.title?.toLowerCase().includes(lq) || i.locationLabel?.toLowerCase().includes(lq)
        );
      }
      out = out.slice(0, limit);
      return json(200, { ok: true, incidents: out, count: out.length });
    }

    /* POST /incidents */
    if (method === "POST" && path === "/incidents") {
      const errs = validateIncident(body);
      if (errs.length)
        return json(422, { ok: false, error: "Validation failed", detail: errs.join("; ") });
      const now = new Date().toISOString();
      const incident = {
        incidentId: `inc-${Date.now().toString(36)}${Math.floor(Math.random() * 46656).toString(36).padStart(3, "0")}`,
        category: body.category,
        track: TRACKS[body.category],
        title: body.title.trim(),
        description: body.description.trim(),
        latitude: Number(body.latitude),
        longitude: Number(body.longitude),
        locationLabel: body.locationLabel.trim(),
        wardId: body.wardId ?? undefined,
        severity: Number(body.severity),
        status: "reported",
        evidenceType: body.evidenceType,
        sourceName: body.sourceName.trim(),
        confidence: body.confidence,
        isDemo: Boolean(body.isDemo),
        photoRef: body.photoRef ?? undefined,
        createdAt: now,
        updatedAt: now,
      };
      await client.send(
        new PutItemCommand({
          TableName: TABLE,
          Item: marshall({
            pk: `INC#${incident.incidentId}`,
            sk: "item",
            status: incident.status,
            track: incident.track,
            createdAt: incident.createdAt,
            payload: JSON.stringify(incident),
          }),
        })
      );
      return json(201, {
        ok: true,
        incident,
        notification: "Stored in the CitySutra workspace only. No authority was notified.",
      });
    }

    /* POST /risk-snapshot — serverless risk analysis + alert record */
    if (method === "POST" && path === "/risk-snapshot") {
      const res = await client.send(new ScanCommand({ TableName: TABLE }));
      const incidents = incidentsFromScan((res.Items ?? []).map((i) => unmarshall(i)));
      const indicators = computeRiskIndicators(incidents);
      const now = new Date().toISOString();
      const alert = {
        alertId: `alert-${Date.now().toString(36)}`,
        kind: "risk-snapshot",
        generatedAt: now,
        indicators,
        incidentCount: incidents.length,
      };
      await client.send(
        new PutItemCommand({
          TableName: TABLE,
          Item: marshall({
            pk: `ALERT#${alert.alertId}`,
            sk: "item",
            createdAt: now,
            payload: JSON.stringify(alert),
          }),
        })
      );
      return json(200, { ok: true, alert });
    }

    /* POST /evidence — store an evidence file in S3 (AWS mode only) */
    if (method === "POST" && path === "/evidence") {
      if (!S3 || !S3_BUCKET) {
        return json(503, {
          ok: false,
          error: "S3 evidence storage is not configured in this deployment (demo mode).",
        });
      }
      const { data, contentType, incidentId } = body;
      if (typeof data !== "string" || !data.length)
        return json(422, { ok: false, error: "data: base64 file content required" });
      if (!EVIDENCE_TYPES.has(contentType))
        return json(422, { ok: false, error: "contentType: image/jpeg|png|webp|heic|text/plain" });
      const bytes = Buffer.from(data, "base64");
      if (bytes.length > MAX_EVIDENCE_BYTES)
        return json(413, { ok: false, error: "file exceeds 1 MB limit" });
      const ext = (contentType.split("/")[1] || "bin").replace("jpeg", "jpg");
      const safeIncident = typeof incidentId === "string" && /^[A-Za-z0-9-]{1,80}$/.test(incidentId)
        ? incidentId
        : "unlinked";
      const key = `evidence/${safeIncident}/${Date.now().toString(36)}.${ext}`;
      await new (await import("@aws-sdk/client-s3")).S3Client({}).send(
        new PutObjectCommand({
          Bucket: S3_BUCKET,
          Key: key,
          Body: bytes,
          ContentType: contentType,
        })
      );
      void S3;
      return json(201, {
        ok: true,
        key,
        note: "Stored in the private CitySutra S3 bucket. Reference it via photoRef on the incident.",
      });
    }

    /* /incidents/{id} */
    const m = path.match(/^\/incidents\/([A-Za-z0-9-]+)$/);
    if (m) {
      const id = m[1];
      if (method === "GET") {
        const res = await client.send(
          new GetItemCommand({ TableName: TABLE, Key: marshall({ pk: `INC#${id}`, sk: "item" }) })
        );
        if (!res.Item) return json(404, { ok: false, error: "Incident not found" });
        const u = unmarshall(res.Item);
        return json(200, { ok: true, incident: u.payload ? JSON.parse(u.payload) : null });
      }
      if (method === "PATCH") {
        const res = await client.send(
          new GetItemCommand({ TableName: TABLE, Key: marshall({ pk: `INC#${id}`, sk: "item" }) })
        );
        if (!res.Item) return json(404, { ok: false, error: "Incident not found" });
        const cur = JSON.parse(unmarshall(res.Item).payload);
        const next = body.status;
        const allowed = STATUS_FLOW[cur.status] ?? [];
        if (!allowed.includes(next)) {
          return json(
            409,
            { ok: false, error: `Cannot move from "${cur.status}" to "${next}". Allowed: ${allowed.join(", ")}.` }
          );
        }
        if (
          next === "rejected" &&
          (typeof body.rejectReason !== "string" || body.rejectReason.trim().length < 5)
        ) {
          return json(422, { ok: false, error: "A rejection reason (≥ 5 characters) is required when rejecting" });
        }
        const updated = {
          ...cur,
          status: next,
          rejectReason: next === "rejected" ? body.rejectReason : undefined,
          updatedAt: new Date().toISOString(),
        };
        await client.send(
          new PutItemCommand({
            TableName: TABLE,
            Item: marshall({
              pk: `INC#${id}`,
              sk: "item",
              status: updated.status,
              track: updated.track,
              createdAt: updated.createdAt,
              payload: JSON.stringify(updated),
            }),
          })
        );
        return json(200, { ok: true, incident: updated });
      }
    }

    /* OPTIONS */
    if (method === "OPTIONS") return json(204, {});

    return json(404, { ok: false, error: `No route: ${method} ${path}` });
  } catch (e) {
    // Log server errors without echoing payloads that may contain personal data.
    console.error("handler error:", e instanceof Error ? e.message : e);
    return json(500, { ok: false, error: "Internal error" });
  }
}

export { handler };
