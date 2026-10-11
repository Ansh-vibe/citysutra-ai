"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Crosshair, ExternalLink, MapPin } from "lucide-react";
import { CATEGORIES, SOURCES, TRACK_META } from "@/lib/config";
import { useCity } from "@/components/CityProvider";
import { useApi } from "@/lib/useApi";
import type { Snapshot } from "@/server/snapshotService";
import type { Incident, IncidentStatus, Track } from "@/lib/types";
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Loading,
  Note,
  PageTitle,
  SectionHead,
  Toggle,
} from "@/components/ui";
import {
  DemoBadge,
  Provenance,
  SeverityDots,
  StatusBadge,
  TrackChip,
} from "@/components/widgets";
import { cx, fmtDateTime } from "@/lib/utils";

const MapClient = dynamic(() => import("@/components/MapClient"), { ssr: false });

const ALL_TRACKS: Track[] = ["air", "heatwater", "waste"];
const ALL_STATUSES: IncidentStatus[] = ["reported", "reviewed", "assigned", "resolved", "rejected"];

export default function MapPage() {
  const { city } = useCity();
  const router = useRouter();
  const inc = useApi<{ ok: boolean; incidents: Incident[] }>(`/api/incidents?limit=200`);
  const snap = useApi<{ ok: boolean; snapshot: Snapshot }>(
    `/api/snapshot?lat=${city.lat}&lon=${city.lon}`,
    [city.lat, city.lon]
  );

  const [tracks, setTracks] = useState<Set<Track>>(new Set(ALL_TRACKS));
  const [statuses, setStatuses] = useState<Set<IncidentStatus>>(new Set(ALL_STATUSES));
  const [demoOnly, setDemoOnly] = useState(false);
  const [showContext, setShowContext] = useState(true);
  const [pickMode, setPickMode] = useState(false);
  const [picked, setPicked] = useState<[number, number] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const incidents = inc.data?.incidents ?? [];
  const filtered = incidents.filter(
    (i) => tracks.has(i.track) && statuses.has(i.status) && (!demoOnly || i.isDemo)
  );
  const selected = incidents.find((i) => i.incidentId === selectedId) ?? null;
  const s = snap.data?.snapshot;

  const toggle = <T,>(set: Set<T>, v: T, apply: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    apply(next);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle kicker="// 02 · map" title="City Incident Map" />
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Incident layers across the three tracks. Markers are reports — never
            “detected hotspots”.
          </p>
        </div>
        <div className="num text-[10.5px] font-semibold text-ink-faint">
          {filtered.length}/{incidents.length} incidents · {city.name}
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* sidebar */}
        <div className="flex flex-col gap-4">
          <Card title="Filters" className="order-2 lg:order-1">
            <div className="space-y-3">
              <div>
                <div className="tick-label mb-1 text-ink-faint">Tracks</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TRACKS.map((t) => (
                    <button
                      key={t}
                      onClick={() => toggle(tracks, t, setTracks)}
                      className={cx(
                        "focus-ring rounded-[2px] border px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wide transition-colors",
                        tracks.has(t) ? "border-ink bg-ink text-white" : "border-ink bg-white text-ink-soft hover:bg-panel-deep"
                      )}
                    >
                      {TRACK_META[t].label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="tick-label mb-1 text-ink-faint">Status</div>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_STATUSES.map((st) => (
                    <button
                      key={st}
                      onClick={() => toggle(statuses, st, setStatuses)}
                      className={cx(
                        "focus-ring rounded-[2px] border px-2 py-1 font-mono text-[10.5px] font-bold uppercase tracking-wide transition-colors",
                        statuses.has(st) ? "border-ink bg-ink text-white" : "border-ink bg-white text-ink-soft hover:bg-panel-deep"
                      )}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2.5 border-t border-line pt-2.5">
                <Toggle checked={demoOnly} onChange={setDemoOnly} label="Demo records only" />
                <Toggle
                  checked={showContext}
                  onChange={setShowContext}
                  label="Environmental context"
                  hint="Grid-cell proxy circle at the selected city"
                />
                <Toggle
                  checked={pickMode}
                  onChange={(v) => {
                    setPickMode(v);
                    if (!v) setPicked(null);
                  }}
                  label="Pick location for a report"
                  hint="Click the map to set coordinates"
                />
              </div>
              {picked && (
                <div className="ink-block rounded-[2px] px-3 py-2">
                  <div className="num text-[11px] text-white">
                    {picked[0].toFixed(5)}, {picked[1].toFixed(5)}
                  </div>
                  <Button
                    variant="outline"
                    className="mt-1.5 w-full border-white/60 bg-transparent text-white hover:bg-white hover:text-[#0a101c]"
                    onClick={() =>
                      router.push(
                        `/report?lat=${picked[0].toFixed(5)}&lon=${picked[1].toFixed(5)}&label=Picked on map`
                      )
                    }
                  >
                    <MapPin size={12} /> Report here
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card title="Legend" className="order-3 lg:order-2">
            <ul className="space-y-1.5">
              {ALL_STATUSES.map((st) => (
                <li key={st} className="flex items-center gap-2">
                  <StatusBadge status={st} />
                  <span className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
                    {st}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-ink-faint">
              Marker size ∝ severity (1–5). Demo records carry a DEMO badge.
            </p>
          </Card>

          <Card title="Environmental context" className="order-1 lg:order-3">
            {!s && snap.loading ? (
              <Loading />
            ) : s ? (
              <div className="space-y-1.5 text-[12px] text-ink-soft">
                <div>
                  <b>US AQI</b> <span className="num">{s.context.airValue ?? "—"}</span>
                  {s.context.airElevated && <Chip tone="coral" className="ml-1.5">elevated</Chip>}
                </div>
                <div>
                  <b>Rain 6 h</b> <span className="num">{s.context.rainNext6hMm ?? "—"} mm</span>{" "}
                  <span className="num text-ink-faint">(prob {s.context.maxProbNext6h ?? "—"} %)</span>
                </div>
                <div>
                  <b>Apparent temp</b> <span className="num">{s.context.heatApparentC ?? "—"} °C</span>
                </div>
                <p className="text-[10.5px] leading-snug text-ink-faint">
                  Grid forecast (≈15–25 km) — a neighborhood proxy, not a street measurement.
                </p>
                <Provenance
                  providerName={s.air.provider.provider}
                  fetchedAt={s.air.provider.fetchedAt}
                  sourceUrl={SOURCES.openMeteoAir}
                />
              </div>
            ) : (
              <ErrorState message={snap.error ?? "context unavailable"} onRetry={snap.refetch} />
            )}
          </Card>
        </div>

        {/* map */}
        <div className="relative order-first min-h-[440px] overflow-hidden rounded-[10px] border border-ink hard lg:order-none lg:h-[calc(100vh-200px)] lg:min-h-[520px]">
          {inc.loading && !inc.data ? (
            <div className="grid h-full place-items-center">
              <Loading label="Loading incidents" />
            </div>
          ) : inc.error ? (
            <div className="grid h-full place-items-center p-6">
              <ErrorState message={inc.error} onRetry={inc.refetch} />
            </div>
          ) : (
            <>
              <MapClient
                incidents={filtered}
                center={[city.lat, city.lon]}
                zoom={12}
                pickMode={pickMode}
                onPick={(lat, lon) => setPicked([lat, lon])}
                picked={picked}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id === selectedId ? null : id)}
                showContext={showContext}
                context={
                  {
                    label: `${s?.context.airValue ?? "—"} AQI · ${s?.context.rainNext6hMm ?? "—"}mm/6h`,
                    lines: [
                      `US AQI ${s?.context.airValue ?? "n/a"} (grid forecast)`,
                      `rain next 6 h: ${s?.context.rainNext6hMm ?? "n/a"} mm`,
                      `apparent temp: ${s?.context.heatApparentC ?? "n/a"} °C`,
                      "grid cell proxy — not street level",
                    ],
                  } as never
                }
              />
              {pickMode && (
                <div className="pointer-events-none absolute top-3 left-1/2 z-[1000] -translate-x-1/2">
                  <Chip tone="ink" className="shadow">
                    <Crosshair size={11} /> Click the map to set the report location
                  </Chip>
                </div>
              )}
              {selected && (
                <div className="absolute top-3 right-3 bottom-3 z-[1000] w-[290px] overflow-auto rounded-[10px] border border-ink bg-white hard shadow-lg">
                  <div className="border-b border-line px-3.5 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-[13.5px] font-bold leading-snug">
                        {selected.title}
                      </h3>
                      <button
                        className="focus-ring -m-1 rounded p-1 font-mono text-ink-faint hover:text-ink"
                        onClick={() => setSelectedId(null)}
                        aria-label="Close details"
                      >
                        ✕
                      </button>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={selected.status} />
                      <TrackChip track={selected.track} />
                      {selected.isDemo && <DemoBadge />}
                    </div>
                  </div>
                  <div className="space-y-2.5 px-3.5 py-3 text-[12px]">
                    <p className="leading-relaxed text-ink-soft">{selected.description}</p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                      <div>
                        <div className="tick-label text-ink-faint">Location</div>
                        {selected.locationLabel}
                      </div>
                      <div>
                        <div className="tick-label text-ink-faint">Coords</div>
                        <span className="num">
                          {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <div className="tick-label text-ink-faint">Severity</div>
                        <SeverityDots severity={selected.severity} />
                      </div>
                      <div>
                        <div className="tick-label text-ink-faint">Category</div>
                        {CATEGORIES[selected.category].label}
                      </div>
                      <div>
                        <div className="tick-label text-ink-faint">Evidence</div>
                        {selected.evidenceType} · {selected.confidence} confidence
                      </div>
                      <div>
                        <div className="tick-label text-ink-faint">Source</div>
                        {selected.sourceName}
                      </div>
                      <div className="col-span-2">
                        <div className="tick-label text-ink-faint">Reported</div>
                        <span className="num">{fmtDateTime(selected.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-line pt-2.5">
                      <Link
                        href={`/incidents?id=${selected.incidentId}`}
                        className="focus-ring rounded-[2px] bg-ink px-2.5 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wide text-white hover:bg-transparent hover:text-ink"
                      >
                        Manage
                      </Link>
                      <Link
                        href={`/report?lat=${selected.latitude.toFixed(5)}&lon=${selected.longitude.toFixed(5)}&label=${encodeURIComponent(selected.locationLabel)}`}
                        className="focus-ring flex items-center gap-1 rounded-[2px] border border-ink px-2.5 py-1.5 font-mono text-[10.5px] font-bold uppercase tracking-wide text-ink-soft hover:bg-ink hover:text-white"
                      >
                        <ExternalLink size={11} /> Nearby
                      </Link>
                    </div>
                    <Note tone="neutral">
                      Provenance: {selected.evidenceType} report · confidence{" "}
                      {selected.confidence}. No automated detection — human-verified only.
                    </Note>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ============ 02 · ledger ============ */}
      <SectionHead no="02" title="Incident ledger" sub={`${filtered.length} rows · scrollable`} />
      <Card pad={false}>
        <div className="max-h-[380px] overflow-auto">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead className="sticky top-0">
              <tr className="ink-block">
                {["Sev", "Title", "Location", "Track", "Status", "Evidence", "Reported", ""].map((h, i) => (
                  <th key={i} className="px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/10">
              {filtered.map((i) => (
                <tr
                  key={i.incidentId}
                  onClick={() => setSelectedId(i.incidentId)}
                  className={cx("cursor-pointer hover:bg-panel-deep", selectedId === i.incidentId && "bg-panel-deep")}
                >
                  <td className="px-3.5 py-2"><SeverityDots severity={i.severity} /></td>
                  <td className="px-3.5 py-2">
                    <span className="text-[12.5px] font-semibold">{i.title}</span>
                    {i.isDemo && <DemoBadge className="ml-1.5" />}
                  </td>
                  <td className="px-3.5 py-2 text-[12px] text-ink-soft">{i.locationLabel}</td>
                  <td className="px-3.5 py-2"><TrackChip track={i.track} /></td>
                  <td className="px-3.5 py-2"><StatusBadge status={i.status} /></td>
                  <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">
                    {i.evidenceType} · {i.confidence}
                  </td>
                  <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">
                    {fmtDateTime(i.createdAt)}
                  </td>
                  <td className="px-3.5 py-2 text-right font-mono text-[10.5px] text-ink-faint">→</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-center text-[12px] text-ink-faint">
                    No incidents match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ============ 03 · layers & provenance ============ */}
      <SectionHead no="03" title="Layers & provenance" sub="attribution · limits" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card hard={false}>
          <div className="tick-label mb-2 text-ink-faint">Layers on this map</div>
          <ul className="space-y-1.5 text-[12px] text-ink-soft">
            <li><b>Incident markers</b> — reported locations only; size ∝ severity; color = lifecycle status.</li>
            <li><b>Grid-context circle</b> — a 2 km ring around the city preset with the current AQI / rain / heat readout. It marks the <i>proxy cell</i> of the ≈15–25 km grid, not a measured zone.</li>
            <li><b>Pick marker</b> — set by clicking the map while “pick location” is on; used only to prefill a report.</li>
          </ul>
        </Card>
        <Card hard={false}>
          <div className="tick-label mb-2 text-ink-faint">Provenance & limits</div>
          <ul className="space-y-1.5 text-[12px] text-ink-soft">
            <li>Basemap © <a className="font-bold underline underline-offset-2" href={SOURCES.osmUrl} target="_blank" rel="noreferrer">OpenStreetMap</a> contributors — used within their tile usage policy; attribution stays visible.</li>
            <li>Environmental values: Open-Meteo grid forecasts/assimilations, cached 5 minutes, never relabeled as street sensors.</li>
            <li>Incidents are human (or seeded demo) reports. No satellite, IoT or automated detection is used.</li>
          </ul>
        </Card>
      </div>
    </main>
  );
}
