import {
  ArrowUpRight,
  BookOpen,
  Database,
  FlaskConical,
  ShieldCheck,
  Table2,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { HoverScramble } from "@/components/Scramble";
import {
  DEFAULT_WEIGHTS,
  DIMENSION_META,
  IMPACT_DEFAULTS,
  INTERACTION_RULES,
  SOURCES,
  SPATIAL_RESOLUTION_NOTE,
  THRESHOLDS,
} from "@/lib/config";

function H({ children }: { children: React.ReactNode }) {
  const isString = typeof children === "string";
  return (
    <h2 className="mb-2 mt-9 flex items-baseline gap-3 first:mt-0">
      <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-ink-faint">{"//"}</span>
      <span className="font-display text-[15px] font-bold uppercase tracking-[0.1em]">
        {isString ? <HoverScramble text={children as string} /> : children}
      </span>
      <span className="h-px flex-1 bg-ink" aria-hidden />
    </h2>
  );
}
function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-2 text-[13px] leading-relaxed text-ink-soft">{children}</p>;
}
function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-0.5 font-semibold text-indigo2 underline decoration-indigo2/40 underline-offset-2"
    >
      {children} <ArrowUpRight size={11} />
    </a>
  );
}
function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
        <thead>
          <tr className="border-b border-line bg-panel-deep/70">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-semibold text-ink-soft">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60 last:border-0">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2 align-top text-ink">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const metadata = { title: "Methodology" };

export default function MethodologyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex items-center gap-2.5">
        <BookOpen size={20} className="text-ink" />
        <div>
          <div className="num text-[10px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
            {"// 07 · methodology"}
          </div>
          <h1 className="font-display text-[26px] font-bold leading-tight tracking-tight sm:text-3xl">
            <HoverScramble text="Methodology, Sources & Limits" />
          </h1>
        </div>
      </div>

      <div className="card mt-4 p-4">
        <P>
          CitySutra AI is a neighborhood-level environmental <b>operations prototype</b>.
          It combines grid-scale air and weather data with reported incidents to produce one
          explainable prioritization score — the <b>Civic Action Priority (0–100)</b>. That
          score is an operational triage number. It is <b>not</b> an official AQI, a
          medical-risk score, a government warning, or a scientifically validated prediction.
          Nothing here makes medical diagnoses or personalized health claims.
        </P>
        <P>
          The whole model is deterministic: identical inputs always produce identical
          scores. There is no opaque “AI prediction” layer, and Amazon Bedrock is not
          required for core operation (an optional future enhancement only).
        </P>
      </div>

      <H>Data sources &amp; index standards</H>
      <Table
        head={["Source", "Used for", "Standard / caveats", "Link"]}
        rows={[
          [
            "Open-Meteo Air Quality API",
            "PM2.5, PM10, US AQI, NO₂, O₃ (hourly) — no EU AQI series offered by the provider",
            "Grid product, ≈15–25 km resolution. An hourly grid assimilation/forecast — never a street sensor.",
            <A key="a" href={SOURCES.openMeteoAir}>open-meteo docs</A>,
          ],
          [
            "Open-Meteo Forecast API",
            "Temp, apparent temp, humidity, precipitation, probability, wind",
            "Grid forecast. Probabilities are model probabilities, not official alerts.",
            <A key="b" href={SOURCES.openMeteoWeather}>open-meteo docs</A>,
          ],
          [
            "CPCB National AQI (reference only)",
            "Official Indian AQI definition",
            "CitySutra does <b>not</b> compute CPCB NAQI (its pollutant sub-indices, units and averaging windows are not satisfied by grid data) and never relabels the US AQI as NAQI.",
            <A key="c" href={SOURCES.cpcbAqi}>CPCB AQI PDF</A>,
          ],
          [
            "Delhi Jal Board (reference only)",
            "Water complaint routing",
            "No live integration exists — the app never files complaints or claims one was filed.",
            <A key="d" href={SOURCES.jalBoard}>Jal Board complaints</A>,
          ],
          [
            "OpenStreetMap",
            "Map basemap",
            "Tile usage policy applies; attribution shown on the map.",
            <A key="e" href={SOURCES.osmUrl}>OSM</A>,
          ],
        ]}
      />
      <P>
        <Wind size={12} className="mr-1 inline text-ink-faint" />
        {SPATIAL_RESOLUTION_NOTE} When a provider is unreachable the UI shows an explicit
        “unavailable” state with the failure reason — it never substitutes a fake or
        relabeled value.
      </P>

      <H>Observation vs forecast</H>
      <P>
        With <code className="num rounded bg-panel-deep px-1">past_days=1</code> the most
        recent completed hour comes from the provider&apos;s analysis/assimilation and future
        hours from forecast. Both are labeled in the UI (“grid forecast” / “latest grid
        value”); neither is presented as a point measurement. The dashboard shows the
        observation timestamp, the fetch time, the provider and the standard for every
        value.
      </P>

      <H>
        <span className="inline-flex items-center gap-1.5"><Table2 size={14} /> Priority model</span>
      </H>
      <P>
        Four dimensions are normalized to 0–100 with documented, configurable
        transformations. Weights are applied only over dimensions that have valid data and
        are renormalized — missing data is never treated as zero, and if no dimension is
        available the UI shows “insufficient data” instead of a score.
      </P>
      <Table
        head={["Dimension", "Weight", "Transform", "Basis"]}
        rows={[
          ["A · Air", `${Math.round(DEFAULT_WEIGHTS.A * 100)}%`, "A = clamp(AQI, 0, 100)", DIMENSION_META.A.description],
          ["H · Heat", `${Math.round(DEFAULT_WEIGHTS.H * 100)}%`, `apparent °C: ≤${THRESHOLDS.heat.minC}→0, ≥${THRESHOLDS.heat.maxC}→100 (linear)`, DIMENSION_META.H.description],
          ["W · Water", `${Math.round(DEFAULT_WEIGHTS.W * 100)}%`, `0.7·(rain 6h/${THRESHOLDS.rain.criticalMm6h} mm) + 0.3·(max probability)`, DIMENSION_META.W.description],
          ["G · Ground", `${Math.round(DEFAULT_WEIGHTS.G * 100)}%`, `Σ severity × ${THRESHOLDS.wastePerIncident} over active waste incidents (cap 100)`, DIMENSION_META.G.description],
        ]}
      />
      <p className="num my-2 rounded-md bg-panel-deep px-3 py-2 text-[12px]">
        score = min(100, Σ (wᵢ / Σw) · valueᵢ + Σ triggered interaction bonuses)
      </p>

      <H>Interaction rules (bounded, explicit)</H>
      <Table
        head={["Rule", "Bonus", "Condition"]}
        rows={INTERACTION_RULES.map((r) => [
          <span key="id" className="num font-semibold">{r.id}</span>,
          <span key="b" className="num">+{r.bonus}</span>,
          r.description,
        ])}
      />
      <P>
        Bonuses are capped so the final score never exceeds 100, and a bonus only attaches
        to an action when <b>all</b> of that rule&apos;s incident evidence is part of the
        action&apos;s evidence set — so every +N point is traceable.
      </P>

      <H>
        <span className="inline-flex items-center gap-1.5"><FlaskConical size={14} /> Scenario calculator assumptions</span>
      </H>
      <Table
        head={["Factor", "Default", "Meaning"]}
        rows={[
          ["CO₂e per t organic diverted", `${IMPACT_DEFAULTS.co2ePerTonneOrganicDivertedT} t CO2e/t`, "Simplified IPCC-style default for diversion from unmanaged disposal (CH₄ LHV-based). Illustrative."],
          ["CO₂e per collection-km", `${IMPACT_DEFAULTS.co2ePerKmCollectionKg} kg/km`, "Assumed small truck, loaded + return. User-editable."],
          ["Biodigester yield", `${IMPACT_DEFAULTS.biogasKwhPerTonneWet} kWh/t wet`, "Optional scenario only — off unless entered."],
          ["Water tariff", `₹${IMPACT_DEFAULTS.waterRatePerKlINR}/kL`, "Illustrative municipal tariff for the monetary line."],
        ]}
      />
      <P>
        All calculator outputs are <b>estimates / scenarios</b> with ±25 % sensitivity
        bands. No measured methane reduction, energy production or CO₂ savings are claimed.
      </P>

      <H>
        <span className="inline-flex items-center gap-1.5"><Database size={14} /> Data, persistence &amp; provenance</span>
      </H>
      <P>
        Incidents carry <code className="num rounded bg-panel-deep px-1">evidenceType</code>{" "}
        (citizen / sensor / official / simulated), <code className="num rounded bg-panel-deep px-1">confidence</code>{" "}
        (low / medium / high), source name, timestamps and a demo flag. All seeded records
        are explicitly labeled <b>DEMO</b> and never described as detected hotspots.
      </P>
      <P>
        Local mode persists to a local Postgres database (clearly labeled in the header).
        In AWS mode the same repository contract is implemented on DynamoDB behind API
        Gateway + Lambda (see <code className="num rounded bg-panel-deep px-1">aws/</code>{" "}
        and the README). Provider calls use finite timeouts, response validation, a 5-minute
        cache, and honest error/stale states.
      </P>

      <H>Known limitations</H>
      <ul className="mb-3 list-disc space-y-1 pl-5 text-[13px] text-ink-soft">
        <li>Grid-scale air/weather (≈15–25 km) is used as a neighborhood proxy.</li>
        <li>US AQI is shown exactly as provided; CPCB National AQI is not computed and no official station feed is scraped.</li>
        <li>The G (waste) dimension reflects reported incidents in this workspace, not a city-wide field survey.</li>
        <li>Heat and rain thresholds are operational assumptions for triage, not government alert levels.</li>
        <li>Scenario calculator factors are illustrative defaults, editable by the user.</li>
        <li>No automated dispatch, no authority notification, no claims that actions occurred.</li>
        <li>Single-operator prototype: no multi-user auth/roles in demo mode.</li>
      </ul>

      <H>
        <span className="inline-flex items-center gap-1.5"><ShieldCheck size={14} /> Verify &amp; report an issue</span>
      </H>
      <P>
        Every number in the UI is backed by a machine-readable methodology endpoint —{" "}
        <code className="num rounded bg-panel-deep px-1">GET /api/methodology</code> —
        returning the exact weights, thresholds, rules and sources. Snapshot, incidents and
        actions are all available via the documented API (see README). If you find a wrong
        value or an unclear assumption, note the route, timestamp and value, and raise it
        in the project issue tracker referenced in the README.
      </P>
      <H>AWS platform &amp; optional AI</H>
      <Table
        head={["Service", "Role in CitySutra AI", "Where"]}
        rows={[
          ["Amazon S3", "Environmental datasets, weather exports and evidence files (private bucket, SSE, 90-day lifecycle for evidence/)", "aws/template.yaml · POST /evidence on the Lambda API"],
          ["AWS Lambda", "Serverless processing: incident CRUD, deterministic risk analysis (POST /risk-snapshot), evidence ingestion", "aws/lambda/handler.mjs"],
          ["Amazon API Gateway", "Exposes the backend APIs with basic request throttling", "aws/template.yaml (HTTP API, /{proxy+})"],
          ["Amazon DynamoDB", "Incident records, action decisions, and ALERT records holding computed risk indicators", "citysutra-<env> table + statusIndex GSI"],
          ["Amazon CloudWatch", "Lambda/API logs, error & throttle metrics, and the citysutra-<env> dashboard", "LoggingConfig + dashboard resource in the template"],
          ["Amazon Bedrock (optional)", "Plain-English explanations of prioritized actions. OFF by default; the deterministic template is the source of truth and every explanation is labeled by engine", "BEDROCK_ENABLED flag · “AI explain” on action cards"],
        ]}
      />
      <P>
        AWS SDK for JavaScript v3 is used server-side only; credentials come from execution
        roles / environment and are never placed in <code className="num rounded bg-panel-deep px-1">NEXT_PUBLIC_*</code>{" "}
        variables or source. AWS SAM (not CDK) is used for infrastructure as code. In local
        demo mode these services are not contacted — the app clearly labels itself “Local
        demo DB” and disables S3-backed photo upload.
      </P>

      <H>API reference (this deployment)</H>
      <Table
        head={["Endpoint", "What it returns", "Notes"]}
        rows={[
          ["GET /api/health", "db ok, backend mode, time", "used by the header mode chip"],
          ["GET /api/snapshot", "full cross-track snapshot (dims, score, actions)", "lat/lon/demoAir params"],
          ["GET /api/incidents", "list with track/status/q/limit filters", "Zod-validated query"],
          ["POST /api/incidents", "creates an incident (201)", "422 on validation failure; throttled"],
          ["PATCH /api/incidents/{id}", "lifecycle transition", "409 on impossible jump; reject needs a reason"],
          ["GET /api/actions · PATCH /api/actions/{id}", "recomputed queue / operator decision", "decisions persist in the action ledger"],
          ["GET /api/providers/air · /weather", "raw provider result incl. ok:false", "honest failure states, 5-min cache"],
          ["GET /api/methodology", "this page's data, machine-readable", "weights, thresholds, rules, sources"],
          ["POST /api/demo/reset", "reseed the labeled demo dataset", "returns the seed count"],
          ["POST /api/explain", "action explanation", "Amazon Bedrock if BEDROCK_ENABLED, else labeled deterministic template"],
        ]}
      />
      <P>
        The standalone Lambda backend additionally serves{" "}
        <code className="num rounded bg-panel-deep px-1">POST /risk-snapshot</code> (serverless
        risk analysis → DynamoDB ALERT record) and{" "}
        <code className="num rounded bg-panel-deep px-1">POST /evidence</code> (S3 evidence
        upload) for operators scripting against the raw API.
      </P>

      <H>Glossary</H>
      <Table
        head={["Term", "Meaning here"]}
        rows={[
          ["Grid product", "Model output on a ~15–25 km lattice; an area-scale estimate, never a street sensor reading."],
          ["Assimilation vs forecast", "Past/current hours come from data assimilation of the model state; future hours are pure forecast. Both labeled in the UI."],
          ["US AQI", "US EPA index (0–500) as provided by the provider. Shown as-is; not converted, not CPCB NAQI."],
          ["Interaction rule", "A bounded, explicitly defined bonus (R-01…R-04) that fires only when both its data condition and its incident evidence are present."],
          ["Renormalisation", "When a dimension is missing, its weight is redistributed over the available dimensions instead of being treated as zero."],
          ["Action ledger", "Persistent store of operator decisions (accepted/dismissed) on generated actions — workspace only."],
          ["DEMO record", "A seeded sample incident, always badged; used for reproducible demonstration, never presented as detected reality."],
        ]}
      />

      <div className="card mt-4 flex flex-wrap items-center gap-3 p-4">
        <span className="text-[12.5px] font-semibold text-ink-soft">Quick links:</span>
        <Link href="/" className="text-[12.5px] font-semibold text-indigo2 underline">Overview</Link>
        <Link href="/impact" className="text-[12.5px] font-semibold text-indigo2 underline">Impact Studio</Link>
        <Link href="/actions" className="text-[12.5px] font-semibold text-indigo2 underline">Action queue</Link>
        <A href={SOURCES.cpcbAqi}>CPCB AQI reference</A>
        <A href={SOURCES.jalBoard}>Jal Board complaints</A>
      </div>
    </main>
  );
}
