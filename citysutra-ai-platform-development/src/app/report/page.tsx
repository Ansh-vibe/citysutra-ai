"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CheckCircle2, Camera, ShieldCheck } from "lucide-react";
import { CATEGORY_LIST, CITIES, SOURCES, TRACK_META } from "@/lib/config";
import { incidentCreateSchema, type IncidentCreateInput } from "@/lib/schemas";
import { useCity } from "@/components/CityProvider";
import { useApi } from "@/lib/useApi";
import {
  Button,
  Card,
  Chip,
  Field,
  Note,
  PageTitle,
  SectionHead,
  Segmented,
  Select,
  TextArea,
  TextInput,
  Toggle,
} from "@/components/ui";
import { DemoBadge, SeverityDots, StatusBadge } from "@/components/widgets";
import type { Incident } from "@/lib/types";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

const SEVERITIES = [1, 2, 3, 4, 5];

function ReportForm() {
  const params = useSearchParams();
  const { city } = useCity();

  const preLat = params.get("lat");
  const preLon = params.get("lon");
  const preLabel = params.get("label");

  const [category, setCategory] = useState<IncidentCreateInput["category"] | "">(
    ""
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentCreateInput["severity"]>(3);
  const [lat, setLat] = useState(preLat ?? city.lat.toFixed(5));
  const [lon, setLon] = useState(preLon ?? city.lon.toFixed(5));
  const [locationLabel, setLocationLabel] = useState(
    preLabel ?? city.name
  );
  const [evidenceType, setEvidenceType] = useState<IncidentCreateInput["evidenceType"]>("citizen");
  const [sourceName, setSourceName] = useState("Citizen report (this form)");
  const [confidence, setConfidence] = useState<IncidentCreateInput["confidence"]>("medium");
  const [isDemo, setIsDemo] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Incident | null>(null);

  const picked: [number, number] | null = useMemo(() => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    return Number.isFinite(la) && Number.isFinite(lo) ? [la, lo] : null;
  }, [lat, lon]);

  const grouped = useMemo(() => {
    const g: Record<string, { id: string; label: string; track: string; hint: string }[]> = {
      heatwater: [],
      waste: [],
      air: [],
    };
    for (const c of CATEGORY_LIST) g[c.track].push(c);
    return g;
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const latN = parseFloat(lat);
    const lonN = parseFloat(lon);
    const payload = {
      category: category as IncidentCreateInput["category"],
      title,
      description,
      latitude: latN,
      longitude: lonN,
      locationLabel,
      severity,
      evidenceType,
      sourceName,
      confidence,
      isDemo,
    };
    const res = incidentCreateSchema.safeParse(payload);
    if (!res.success) {
      const errs: Record<string, string> = {};
      for (const issue of res.error.issues) {
        errs[String(issue.path[0] ?? "form")] = issue.message;
      }
      setErrors(errs);
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      const r = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(res.data),
      });
      const j = (await r.json()) as { ok: boolean; incident?: Incident; error?: string };
      if (!r.ok || !j.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setCreated(j.incident!);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : "Submission failed" });
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="mx-auto max-w-xl">
        <Card>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 size={30} className="text-teal" />
            <h1 className="font-display text-lg font-bold">Incident recorded</h1>
            <div className="num rounded-md bg-panel-deep px-3 py-1.5 text-[13px] font-semibold">
              {created.incidentId}
            </div>
            <p className="text-[13px] text-ink-soft">
              <b>{created.title}</b> · {created.locationLabel} · severity {created.severity}/5 ·
              status <b>reported</b>
            </p>
            <Note tone="amber">
              Stored in the CitySutra workspace only.{" "}
              <b>No government authority, utility or field team was notified</b> — an
              authorized human must take any real-world action.
            </Note>
            {created.isDemo && (
              <Note tone="indigo">Marked as a demo/test record and labeled DEMO in all views.</Note>
            )}
            <div className="flex gap-2 pt-1">
              <Button variant="teal" onClick={() => { setCreated(null); setTitle(""); setDescription(""); }}>
                Report another
              </Button>
              <Link
                href={`/incidents?id=${created.incidentId}`}
                className="focus-ring rounded-md border border-line-strong px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-panel-deep"
              >
                Open in incidents
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      <Card title="Report an incident">
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Track / category" required error={errors.category} className="sm:col-span-2">
              <div className="space-y-2">
                {(["heatwater", "waste", "air"] as const).map((t) => (
                  <div key={t}>
                    <div
                      className="mb-1 text-[10.5px] font-bold uppercase tracking-wide"
                      style={{ color: TRACK_META[t].color }}
                    >
                      {TRACK_META[t].label}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.values(grouped[t]).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          title={c.hint}
                          onClick={() => setCategory(c.id as never)}
                        className={
                          category === c.id
                            ? "focus-ring rounded border border-ink bg-ink px-2 py-1 text-[11.5px] font-semibold text-panel"
                            : "focus-ring rounded border border-line-strong bg-panel px-2 py-1 text-[11.5px] font-medium text-ink-soft hover:bg-panel-deep"
                        }
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Field>

            <Field label="Title" required error={errors.title} className="sm:col-span-2">
              <TextInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short, specific title (e.g., “Open waste burning near market lane”)"
                maxLength={120}
              />
            </Field>

            <Field label="Description" required error={errors.description} className="sm:col-span-2" hint="min 10 characters">
              <TextArea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you observe, since when, and where exactly? No personal data or diagnoses."
                maxLength={2000}
              />
            </Field>

            <Field label="Severity" required className="sm:col-span-2" hint="1 = minor · 5 = urgent / dangerous">
              <div className="flex items-center gap-2">
                {SEVERITIES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSeverity(s as never)}
                    className={
                      severity === s
                        ? "focus-ring num h-8 w-8 rounded-md bg-coral text-[13px] font-bold text-white"
                        : "focus-ring num h-8 w-8 rounded-md border border-line-strong bg-panel text-[13px] font-semibold text-ink-soft hover:bg-panel-deep"
                    }
                  >
                    {s}
                  </button>
                ))}
                <span className="text-[11.5px] text-ink-faint">
                  {["", "minor", "annoyance", "active issue", "significant", "urgent"][severity]}
                </span>
              </div>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Evidence type" required>
              <Select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value as never)}
              >
                <option value="citizen">Citizen observation</option>
                <option value="sensor">Sensor / device</option>
                <option value="official">Official source</option>
                <option value="simulated">Simulated (test)</option>
              </Select>
            </Field>
            <Field label="Confidence" required hint="how sure are you">
              <Segmented
                value={confidence}
                onChange={(v) => setConfidence(v)}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
              />
            </Field>
            <Field label="Source name" required>
              <TextInput value={sourceName} onChange={(e) => setSourceName(e.target.value)} maxLength={80} />
            </Field>
            <Field
              label="Simulated / real"
              hint="explicit indication, shown as a DEMO badge"
            >
              <Toggle
                checked={isDemo}
                onChange={setIsDemo}
                label={isDemo ? "Yes — demo / test record" : "No — real observation"}
              />
            </Field>
          </div>

          <Note tone="neutral">
            <Camera size={12} className="mr-1 inline" />
            Photo upload: in local demo mode no Amazon S3 evidence bucket is configured, so
            we do not accept unhandled files. In AWS mode the backend exposes a private
            S3-backed evidence endpoint (1 MB limit, image types only).
          </Note>

          {errors.form && (
            <Note tone="coral">
              <ShieldCheck size={12} className="mr-1 inline" /> {errors.form}
            </Note>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <Link
              href="/"
              className="focus-ring rounded-md px-3 py-1.5 text-[13px] font-semibold text-ink-soft hover:bg-panel-deep"
            >
              Cancel
            </Link>
            <Button type="submit" busy={submitting}>
              Submit report
            </Button>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        <Card title="Location">
          <div className="space-y-3">
            <Field label="Neighborhood / area" required error={errors.locationLabel}>
              <TextInput
                value={locationLabel}
                onChange={(e) => setLocationLabel(e.target.value)}
                placeholder="e.g., Lajpat Nagar, Delhi"
                maxLength={160}
              />
            </Field>
            <Field label="Start from a preset" hint="sets coordinates">
              <Select
                value=""
                onChange={(e) => {
                  const c = CITIES.find((x) => x.id === e.target.value);
                  if (c) {
                    setLat(c.lat.toFixed(5));
                    setLon(c.lon.toFixed(5));
                    setLocationLabel((prev) => prev || c.name);
                  }
                }}
              >
                <option value="">— select —</option>
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <MapPicker
              value={picked}
              onChange={(v) => {
                setLat(v[0].toFixed(5));
                setLon(v[1].toFixed(5));
              }}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Latitude" required error={errors.latitude}>
                <TextInput
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  inputMode="decimal"
                  className="num"
                />
              </Field>
              <Field label="Longitude" required error={errors.longitude}>
                <TextInput
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  inputMode="decimal"
                  className="num"
                />
              </Field>
            </div>
            <p className="text-[11px] text-ink-faint">
              Approximate location is fine. Do not include addresses of private
              residences or personal contact details.
            </p>
          </div>
        </Card>
        <Note tone="indigo">
          Water complaints in Delhi can also be raised directly with the{" "}
          <a href={SOURCES.jalBoard} target="_blank" rel="noreferrer" className="font-semibold underline">
            Delhi Jal Board
          </a>{" "}
          through their published channels. This app does <b>not</b> submit to them —
          there is no approved live integration.
        </Note>
      </div>
    </div>
  );
}

function RecentReports() {
  const { data } = useApi<{ ok: boolean; incidents: Incident[] }>(`/api/incidents?limit=6`);
  const list = data?.incidents ?? [];
  return (
    <Card pad={false} hard={false}>
      {list.length === 0 ? (
        <div className="p-4 text-[12px] text-ink-faint">No reports yet.</div>
      ) : (
        <div className="max-h-[260px] overflow-auto">
          <ul className="divide-y divide-ink/10">
            {list.map((i) => (
              <li key={i.incidentId}>
                <Link
                  href={`/incidents?id=${i.incidentId}`}
                  className="focus-ring flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-panel-deep"
                >
                  <SeverityDots severity={i.severity} />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
                    {i.title}
                  </span>
                  {i.isDemo && <DemoBadge />}
                  <StatusBadge status={i.status} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export default function ReportPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle kicker="// 04 · report" title="Report an Incident" />
          <p className="mt-1 max-w-2xl text-[12.5px] text-ink-soft">
            Neighborhood-level environmental incidents. Every submission is validated,
            stored in the workspace, and never auto-forwarded to authorities.
          </p>
        </div>
        <Chip tone="neutral">validation · zod · 422 on bad input</Chip>
      </div>

      <Suspense>
        <ReportForm />
      </Suspense>

      {/* ============ sections below the form ============ */}
      <SectionHead no="01" title="Reporting guidelines" sub="what makes a good report" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card hard hard-hover p-4">
          <div className="num text-[10px] font-bold text-teal">DO</div>
          <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-ink-soft">
            <li>· Be specific: “drain backing up since 6 am”, not “drain issue”.</li>
            <li>· Mark approximate location (area level is fine).</li>
            <li>· Set severity to match visible impact, and confidence to your certainty.</li>
            <li>· Mark test reports as <b>simulated</b> so operators can filter them.</li>
          </ul>
        </div>
        <div className="card hard hard-hover p-4">
          <div className="num text-[10px] font-bold text-coral">DON’T</div>
          <ul className="mt-1.5 space-y-1 text-[12px] leading-relaxed text-ink-soft">
            <li>· No personal contact details, phone numbers or identities.</li>
            <li>· No health diagnoses or medical claims — environmental conditions only.</li>
            <li>· No private residential addresses.</li>
            <li>· Don’t expect automatic escalation: nothing is auto-filed anywhere.</li>
          </ul>
        </div>
        <div className="card hard hard-hover p-4">
          <div className="num text-[10px] font-bold text-indigo2">LIFECYCLE</div>
          <div className="mt-1.5 font-mono text-[11px] leading-relaxed text-ink-soft">
            reported → reviewed → assigned → resolved
            <br />
            (or rejected, with a mandatory reason)
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-faint">
            Every transition is validated by the API (409 on impossible jumps) and visible
            on the Incidents page.
          </p>
        </div>
      </div>

      <SectionHead no="02" title="Where reports go" sub="honest data flow" />
      <div className="grid gap-4 md:grid-cols-2">
        <Note tone="teal">
          <b>Stored:</b> this workspace&apos;s active backend (local demo DB or DynamoDB in
          AWS mode), with evidence type, confidence, timestamps and demo flag. It feeds the
          G (waste) dimension and the rule engine — transparently.
        </Note>
        <Note tone="amber">
          <b>Not stored / not sent:</b> government complaint channels (e.g.{" "}
          <a href={SOURCES.jalBoard} target="_blank" rel="noreferrer" className="font-bold underline">
            Delhi Jal Board
          </a>
          ) — no approved live integration exists, and the app never claims one was filed.
          Photo evidence: no S3 workflow configured in demo mode, so uploads are disabled.
        </Note>
      </div>

      <SectionHead no="03" title="Recent reports" sub="latest 6 · scrollable" />
      <RecentReports />
    </main>
  );
}
