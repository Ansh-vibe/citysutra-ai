# CitySutra AI — The Urban Climate Action Twin

**Environments Hacks · AWS Centre, Delhi — Tracks: 01 Air · 02 Heat & Water · 03 Waste & Energy**

A neighborhood-level environmental **operations** platform. One shared evidence layer
(air + heat/water + waste), one deterministic cross-track prioritization engine, one
incident lifecycle, one action ledger. Delhi-first with a configurable city/coordinate
model for other Indian cities.

> **Honesty by design.** Grid forecasts are never presented as street sensors. US/EU AQI
> are never relabeled as CPCB National AQI. Demo records are always badged **DEMO**.
> Nothing dispatches teams or files complaints with authorities. Scenario calculator
> outputs are labeled **estimates**, never measured outcomes.

---

## Routes

| Route | What it does |
|---|---|
| `/` | Overview: A/H/W/G dimension tiles, Civic Action Priority, interaction rules, 48 h air chart, 24 h heat/rain chart, active incidents, top actions, demo reset |
| `/map` | Leaflet/OSM map: track & status filters, demo filter, grid-context proxy layer, location picking for reports, incident detail panel |
| `/actions` | Prioritized response queue — every card explains score, evidence, missing data, assumptions, owner and next step; accept/dismiss recorded |
| `/report` | Validated incident submission (Zod), map picker, explicit simulated/real toggle, confirmation with incident ID |
| `/incidents` | List, filters, detail, lifecycle (reported → reviewed → assigned → resolved, reject with reason), demo reset |
| `/impact` | What-if calculator: waste diversion, route efficiency, water recovery, optional energy — formulas, units, assumptions, ±25 % sensitivity, "insufficient data" states |
| `/methodology` | Every source, index standard, weight, threshold, rule, assumption and limitation |

## Architecture

```
                 ┌────────────────────────────── Browser ─────────────────────────────┐
                 │  Next.js 16 (App Router) · React 19 · Tailwind v4 · Recharts ·     │
                 │  Leaflet/OSM · Lucide · Zod                                        │
                 └───────▲──────────────────────────────────────────────▲────────────┘
                         │ same-origin fetch                            │ (providers via API)
   ┌─────────────────────┴──────────────┐                 ┌─────────────┴──────────────┐
   │  Next API routes (route handlers)  │                 │  Open-Meteo Air Quality +  │
   │  /api/health /api/snapshot         │   8 s timeout   │  Forecast API              │
   │  /api/incidents /api/actions       │ ──────────────▶ │  (grid, ~15–25 km; TTL     │
   │  /api/providers /api/demo /…       │                 │   cache 5 min; validated)  │
   └─────────────┬──────────────────────┘                 └────────────────────────────┘
                 │ repository contract (src/server/repository.ts)
      ┌──────────┴───────────────────────────────┐
      │ REPO_MODE=local (default, clearly        │ REPO_MODE=dynamodb
      │ labeled demo mode)                       │ (AWS persistent backend)
      ▼                                          ▼
 PostgreSQL (Drizzle ORM)                DynamoDB single table (pk/sk + statusIndex GSI)
 sandbox / local dev                     behind API Gateway + Lambda (aws/template.yaml)
```

**Engine (pure, unit-tested, deterministic)** — `src/lib/`:
- `priority.ts` — Civic Action Priority = `min(100, Σ (wᵢ/Σw)·valueᵢ + Σ triggered bonuses)`;
  weights A 30 / H 25 / W 20 / G 25; missing dimensions renormalize (never zero);
  no data → "insufficient data", never a fake 0.
- `recommendations.ts` — rule-based action generator (AIR-1, WTR-1, DRN-1, WST-1/2,
  FALLBACK) + four bounded interaction rules (R-01…R-04) with per-action attribution.
- `snapshot.ts` — dimension transforms (documented in `config.ts`).
- `impact.ts` — scenario calculator with formulas/units/assumptions/sensitivity.

## Local setup

```bash
npm install
cp .env.example .env        # DATABASE_URL must point at a local Postgres
npx drizzle-kit push        # create tables (incidents, action_ledger)
npm run dev                 # http://localhost:3000
```

The first API call auto-seeds the labeled demo dataset (8 DEMO records).
Use **Reset demo** on the Overview or Incidents page to restore it.

### Tests

```bash
npx vitest run        # priority math, renormalization, validation, impact
npm run lint          # eslint
npm run typecheck     # tsc --noEmit
npm run build         # production build
```

## Demo script (5 minutes)

1. **Overview** — read the four dimension tiles (source, timestamp, forecast label).
   Note "Local demo storage" in the header.
2. Flip **Simulated AQI (demo)** — the A dimension switches to a clearly-labeled
   SIMULATED value (US AQI 132). The R-01 interaction (open burning + elevated air)
   now triggers; the Civic Action Priority jumps. Turn it off — the score follows the
   live grid (or shows "missing" if the feed is unreachable).
3. **Map** — filters by track/status; click the DEMO open-burning marker → detail panel
   with provenance and confidence; use *Pick location* → **Report** to prefill a new report.
4. **Report** — submit a valid report (validation rejects malformed input); get the
   confirmation with incident ID. Notice: *no authority was notified*.
5. **Incidents** — move the DEMO open-burning incident reported → reviewed → resolved.
6. **Overview** — the G (waste) dimension and R-01 drop → before/after priority change.
   The banner reminds: resolving incidents changes *model inputs*, not real air quality.
7. **Actions** — accept the top action (recorded in the action ledger only).
8. **Impact** — edit the diversion % and watch results, formulas and ±25 % sensitivity
   recompute; clear all inputs → "insufficient data" (never fake zeros).
9. **Methodology** — the exact weights, thresholds, rules and sources behind every number.

## API (implemented in `src/app/api/`)

| Method & path | Notes |
|---|---|
| `GET /api/health` | db ok, backend mode, time |
| `GET /api/incidents?track=&status=&q=&limit=` | validated query |
| `POST /api/incidents` | Zod-validated body; 201; throttled; CORS-restricted |
| `GET /api/incidents/{id}` | 404 if missing |
| `PATCH /api/incidents/{id}` | `{status, rejectReason?}`; 409 on invalid transition; 422 on bad payload |
| `GET /api/actions?lat=&lon=&aqiStandard=&demoAir=` | recomputed + merged with recorded operator statuses |
| `PATCH /api/actions/{id}` | `{status: open|accepted|dismissed}` — records a workspace decision only |
| `GET /api/snapshot?lat=&lon=&demoAir=` | full cross-track snapshot |
| `GET /api/providers/air` · `GET /api/providers/weather` | provider result incl. honest ok:false |
| `GET /api/methodology` | machine-readable weights/thresholds/rules/sources |
| `POST /api/demo/reset` | reproducible demo dataset reset |
| `POST /api/explain` | explanation for a prioritized action | Amazon Bedrock when `BEDROCK_ENABLED=true`, else a labeled deterministic template |

**Standalone Lambda API (raw backend, `ApiEndpoint` output):** `GET /health`,
`GET /incidents`, `POST /incidents`, `GET /incidents/{id}`, `PATCH /incidents/{id}`,
`POST /risk-snapshot` (serverless risk analysis → DynamoDB ALERT record) and
`POST /evidence` (S3 evidence upload, 1 MB, image types only).

## AWS platform

CitySutra AI runs on an AWS cloud infrastructure:

| Service | Role |
|---|---|
| **Amazon S3** | Environmental datasets, weather exports and evidence files — private bucket `citysutra-evidence-<env>-<region>` (SSE-AES256, all public access blocked, 90-day lifecycle on `evidence/`) |
| **AWS Lambda** | Serverless data processing: incident CRUD, deterministic risk analysis (`POST /risk-snapshot`), evidence ingestion (`POST /evidence`) |
| **Amazon API Gateway** | HTTP API exposing the backend with basic request throttling (15 rps / burst 30) |
| **Amazon DynamoDB** | Incident records, action decisions and **ALERT records** holding analyzed risk indicators / location-based insight snapshots (`statusIndex` GSI for status filtering) |
| **Amazon CloudWatch** | Lambda + API logs (14-day retention), error/duration/throttle metrics and the `citysutra-<env>` dashboard |
| **Amazon Bedrock** *(optional)* | Plain-English “AI explain” on action cards. **Off by default** (`BEDROCK_ENABLED=true` to enable); otherwise a clearly-labeled deterministic template explains the same rule-based score. The deterministic engine is always the source of truth |

**AWS open-source tooling:** AWS SDK for JavaScript v3 (server-side only — DynamoDB, S3,
Bedrock runtime); **AWS SAM** is used for infrastructure-as-code (chosen over CDK for
same-day hackathon simplicity).

## AWS deployment (creates resources — only with your explicit go-ahead)

**Backend (API Gateway + Lambda + DynamoDB + S3 + CloudWatch):**

```bash
cd aws/lambda && npm install --omit=dev && cd ..
sam build
sam deploy --guided \
  --parameter-overrides Env=dev AllowedOrigin=https://YOUR-AMPLIFY-APP.amplifyapp.com
# Outputs: ApiEndpoint, TableName, EvidenceBucket, DashboardName
```

**Frontend (AWS Amplify Hosting):**
1. Push the repo to your Git provider; create an Amplify app from it (`amplify.yml` is
   included; Amplify auto-detects Next.js).
2. Console → Environment variables: `NEXT_PUBLIC_APP_URL` (Amplify domain),
   `REPO_MODE=dynamodb`, `DYNAMO_TABLE=<stack output>`, `AWS_REGION=ap-south-1`.
3. Optional Bedrock explanations: add `BEDROCK_ENABLED=true` and
   `BEDROCK_MODEL_ID` (e.g. `anthropic.claude-3-haiku-20240307-v1:0`), and grant the
   runtime role `bedrock:InvokeModel` for that model — least privilege.
4. Deploy. The app header flips from *Local demo storage* to *DynamoDB*.

**Cleanup:**

```bash
sam delete --yes
aws dynamodb delete-table --table-name citysutra-dev   # if separate
aws s3 rb s3://citysutra-evidence-dev-<region> --force  # evidence bucket
# + delete the Amplify app from the console
```

## Known limitations

- Air/weather are Open-Meteo grid products (≈15–25 km) — neighborhood proxies, not sensors.
- No CPCB NAQI computation (official sub-index requirements not met by grid data); no
  official station feed is scraped.
- G dimension reflects workspace incidents, not a city-wide field survey.
- Heat/rain thresholds are configurable operational assumptions, not government alerts.
- Impact factors are illustrative defaults (user-editable, shown per result).
- Single-operator prototype (no auth/roles in demo mode); scan-based DynamoDB reads are
  fine at hackathon scale (status filtering uses the GSI).

## Security notes

- No AWS credentials or private keys in `NEXT_PUBLIC_*` or source; `.env` is gitignored;
  only `.env.example` is committed.
- CORS restricted to `localhost:3000` + `NEXT_PUBLIC_APP_URL`; in-memory throttling on
  mutating routes; gateway throttling in the SAM template.
- Validation via shared Zod schemas; errors never echo raw personal data.
- Logs record errors without incident payloads.
