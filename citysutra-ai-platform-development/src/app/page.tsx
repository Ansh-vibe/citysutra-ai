"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, CloudOff, RotateCcw, RefreshCw } from "lucide-react";
import { CITIES, SOURCES, SPATIAL_RESOLUTION_NOTE } from "@/lib/config";
import { useCity } from "@/components/CityProvider";
import { useApi, useMutate } from "@/lib/useApi";
import type { Snapshot } from "@/server/snapshotService";
import type { Incident } from "@/lib/types";
import {
  Button,
  Card,
  Chip,
  ErrorState,
  Loading,
  Note,
  PageTitle,
  SectionHead,
  Select,
  SourceLink,
  Toggle,
} from "@/components/ui";
import {
  ActionCard,
  DemoBadge,
  DimensionTile,
  InteractionsList,
  MissingNote,
  PriorityPanel,
  Provenance,
  SeverityDots,
  StatusBadge,
  TrackChip,
} from "@/components/widgets";
import { MountDecode } from "@/components/Scramble";
import { fmtDateTime, timeAgo } from "@/lib/utils";

const AirChart = dynamic(() => import("@/components/AirChart"), { ssr: false });
const WeatherChart = dynamic(() => import("@/components/WeatherChart"), { ssr: false });

export default function OverviewPage() {
  const { city, demoAir, setDemoAir, setCityId } = useCity();
  const snapPath = `/api/snapshot?lat=${city.lat}&lon=${city.lon}&demoAir=${demoAir}`;
  const snap = useApi<{ ok: boolean; snapshot: Snapshot }>(snapPath, [
    city.lat,
    city.lon,
    demoAir,
  ]);
  const inc = useApi<{ ok: boolean; incidents: Incident[] }>(`/api/incidents?limit=14`);
  const reset = useMutate<void, { ok: boolean; seeded: number; message: string }>(
    "/api/demo/reset",
    "POST"
  );

  const s = snap.data?.snapshot;
  const active = (inc.data?.incidents ?? []).filter((i) =>
    ["reported", "reviewed", "assigned"].includes(i.status)
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* ============ header ============ */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <PageTitle kicker="// 01 · overview · delhi-first" title="Neighborhood Environmental Operations" />
          <p className="mt-1.5 max-w-2xl text-[12.5px] text-ink-soft">
            One evidence layer across <b>air</b>, <b>heat &amp; water</b> and{" "}
            <b>waste &amp; energy</b> — deterministic prioritization, no black boxes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
            City
            <Select
              value={city.id}
              onChange={(e) => setCityId(e.target.value)}
              className="w-52"
              aria-label="City preset"
            >
              {CITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-ink-soft">
            Index
            <Chip tone="indigo" title="Standard provided by Open-Meteo. Not CPCB National AQI — see Methodology.">
              US AQI
            </Chip>
          </div>
          <Toggle
            checked={demoAir}
            onChange={setDemoAir}
            label="Simulated AQI (demo)"
            hint="Labeled placeholder for the demo scenario"
          />
          <Button variant="outline" onClick={snap.refetch} busy={snap.loading}>
            <RefreshCw size={13} /> Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => reset.run().then(() => { snap.refetch(); inc.refetch(); }).catch(() => {})}
            busy={reset.busy}
            title="Resets the demo dataset"
          >
            <RotateCcw size={13} /> Reset demo
          </Button>
        </div>
      </div>

      {snap.error && (
        <div className="mt-4">
          <ErrorState message={`Snapshot failed: ${snap.error}`} onRetry={snap.refetch} />
        </div>
      )}

      {snap.loading && !snap.data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card><Loading label="Fetching air quality grid" /></Card>
          <Card><Loading label="Fetching weather forecast" /></Card>
          <Card className="lg:col-span-2"><Loading label="Building priority model" /></Card>
        </div>
      )}

      {s && !snap.error && (
        <>
          {/* provenance strip */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5">
            <span className="num text-[10.5px] font-semibold text-ink-faint">
              generated {fmtDateTime(s.generatedAt)} · {city.name}
            </span>
            <Provenance
              providerName={s.air.provider.provider}
              fetchedAt={s.air.provider.fetchedAt}
              sourceUrl={SOURCES.openMeteoAir}
              note={s.air.provider.ok ? "grid forecast/assimilation" : `unavailable: ${s.air.provider.error}`}
            />
            <Provenance
              providerName={s.weather.provider.provider}
              fetchedAt={s.weather.provider.fetchedAt}
              sourceUrl={SOURCES.openMeteoWeather}
              note={s.weather.provider.ok ? "grid forecast" : `unavailable: ${s.weather.provider.error}`}
            />
            <span className="num text-[10px] text-ink-faint">{SPATIAL_RESOLUTION_NOTE}</span>
          </div>

          {/* ============ 01 · dimensions ============ */}
          <SectionHead no="01" title="Environmental dimensions" sub="A / H / W / G · 0–100" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <DimensionTile dim={s.context.dims.A} />
            <DimensionTile dim={s.context.dims.H} />
            <DimensionTile dim={s.context.dims.W} />
            <DimensionTile dim={s.context.dims.G} />
          </div>

          {/* ============ 02 · priority ============ */}
          <SectionHead no="02" title="Civic Action Priority" sub="weights A30 H25 W20 G25" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Card title="City context score" className="lg:col-span-2">
              <PriorityPanel priority={s.cityPriority} />
            </Card>
            <Card title="Cross-track interaction rules">
              <InteractionsList interactions={s.interactions} />
            </Card>
          </div>

          {/* ============ 03 · charts ============ */}
          <SectionHead no="03" title="Live signal — grid forecast" sub="open-meteo · 5 min cache" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card
              title="Air quality · US AQI · 48 h"
              aside={
                s.air.provider.ok ? (
                  <Chip tone={s.context.airElevated ? "coral" : "teal"}>
                    now {s.context.airValue ?? "—"}
                  </Chip>
                ) : (
                  <Chip tone="coral">Unavailable</Chip>
                )
              }
            >
              {s.air.provider.ok && s.air.provider.data ? (
                <>
                  <AirChart
                    time={s.air.provider.data.hourly.time}
                    aqi={s.air.provider.data.hourly.usAqi}
                  />
                  <p className="mt-2 text-[11px] text-ink-faint">
                    Provider: {s.air.provider.provider} · US EPA AQI as provided
                    {s.context.dims.A?.status === "simulated" ? " · currently SIMULATED (demo)" : ""}{" "}
                    — <b>not</b> CPCB National AQI.{" "}
                    <SourceLink href={SOURCES.cpcbAqi}>CPCB reference</SourceLink>
                  </p>
                </>
              ) : (
                <div className="py-4">
                  <MissingNote label={`${s.air.provider.provider} air feed (${s.air.provider.error})`} />
                </div>
              )}
            </Card>
            <Card
              title="Heat & rainfall · 24 h"
              aside={
                s.weather.provider.ok ? (
                  <Chip tone="neutral">
                    <CloudOff size={10} className="hidden" />
                    {s.weather.provider.data?.rainNext6hMm ?? 0} mm rain / 6 h
                  </Chip>
                ) : (
                  <Chip tone="coral">Unavailable</Chip>
                )
              }
            >
              {s.weather.provider.ok && s.weather.provider.data ? (
                <>
                  <WeatherChart
                    time={s.weather.provider.data.hourly.time}
                    temperature={s.weather.provider.data.hourly.temperature}
                    apparent={s.weather.provider.data.hourly.apparent}
                    precipitation={s.weather.provider.data.hourly.precipitation}
                  />
                  <p className="mt-2 text-[11px] text-ink-faint">
                    Apparent temperature drives the H dimension (32→42 °C → 0→100, configurable
                    assumption — not an official heat alert).
                  </p>
                </>
              ) : (
                <div className="py-4">
                  <MissingNote label={`${s.weather.provider.provider} weather feed (${s.weather.provider.error})`} />
                </div>
              )}
            </Card>
          </div>

          {/* ============ 04 · top actions + field reports ============ */}
          <SectionHead no="04" title="Response queue & field reports" sub={`${active.length} active`} />
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              {s.actions.length === 0 ? (
                <Card><p className="text-[12.5px] text-ink-faint">No active incidents match a rule right now.</p></Card>
              ) : (
                <div className="space-y-3">
                  {s.actions.slice(0, 2).map((a) => (
                    <ActionCard key={a.actionId} action={a} />
                  ))}
                  <Link
                    href="/actions"
                    className="focus-ring flex items-center gap-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink underline decoration-2 underline-offset-4 hover:bg-ink hover:text-white"
                  >
                    Full queue · {s.actions.length} actions <ArrowRight size={13} />
                  </Link>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3">
              <Card title={`Active incidents (${active.length})`} pad={false}>
                <div className="max-h-[340px] overflow-auto">
                  <ul className="divide-y divide-ink/10">
                    {active.slice(0, 8).map((i) => (
                      <li key={i.incidentId}>
                        <Link
                          href={`/incidents?id=${i.incidentId}`}
                          className="focus-ring flex flex-wrap items-center gap-x-2.5 gap-y-1 px-3.5 py-2.5 hover:bg-panel-deep"
                        >
                          <SeverityDots severity={i.severity} />
                          <span className="min-w-0 flex-1 truncate text-[12.5px] font-semibold text-ink">
                            {i.title}
                          </span>
                          {i.isDemo && <DemoBadge />}
                          <StatusBadge status={i.status} />
                          <span className="num hidden text-[10px] text-ink-faint sm:inline">
                            {timeAgo(i.createdAt)}
                          </span>
                        </Link>
                      </li>
                    ))}
                    {active.length === 0 && (
                      <li className="px-4 py-5 text-center text-[12px] text-ink-faint">
                        No active incidents —{" "}
                        <Link href="/report" className="font-bold text-ink underline">report one</Link>.
                      </li>
                    )}
                  </ul>
                </div>
              </Card>
              <Note tone="amber">
                Resetting or resolving demo incidents changes the <b>model inputs</b> (waste
                dimension, interaction rules) — it does not change real-world air quality or
                any field condition.
              </Note>
              <Note tone="neutral">
                This workspace does not file complaints with the{" "}
                <SourceLink href={SOURCES.jalBoard}>Delhi Jal Board</SourceLink> or any other
                authority. Government submission is not integrated.
              </Note>
            </div>
          </div>

          {/* ============ 05 · signal board ============ */}
          <SectionHead no="05" title="Signal board — raw observations" sub="scrollable" />
          <Card pad={false}>
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead className="sticky top-0">
                  <tr className="ink-block">
                    {["Variable", "Value", "Unit", "Refers to", "Fetched", "Type", "Standard / note"].map((h) => (
                      <th key={h} className="px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/10">
                  {s.air.provider.ok &&
                    s.air.provider.data &&
                    s.air.provider.data.observations.map((o) => (
                      <tr key={o.id} className="hover:bg-panel-deep">
                        <td className="num px-3.5 py-2 text-[11.5px] font-bold">{o.variable}</td>
                        <td className="num px-3.5 py-2 text-[11.5px]">{o.value}</td>
                        <td className="num px-3.5 py-2 text-[11px] text-ink-faint">{o.unit}</td>
                        <td className="num px-3.5 py-2 text-[11px]">{fmtDateTime(o.timestamp)}</td>
                        <td className="num px-3.5 py-2 text-[11px] text-ink-faint">{timeAgo(o.fetchedAt)}</td>
                        <td className="px-3.5 py-2"><Chip tone={o.observationType === "simulated" ? "amber" : "neutral"}>{o.observationType}</Chip></td>
                        <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">
                          {o.providerStandard ?? o.spatialResolution}
                        </td>
                      </tr>
                    ))}
                  {s.air.provider.ok &&
                    !!s.air.provider.data &&
                    s.air.provider.data.observations.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-4 text-center text-[12px] text-ink-faint">
                        Air observations unavailable right now.
                      </td>
                    </tr>
                  )}
                  {s.weather.provider.ok &&
                    s.weather.provider.data &&
                    (() => {
                      const d = s.weather.provider.data!;
                      const rows = [
                        ["temperature_2m", d.current.temperature, "°C"],
                        ["apparent_temperature", d.current.apparent, "°C"],
                        ["relative_humidity_2m", d.current.humidity, "%"],
                        ["rain_next_6h", d.rainNext6hMm, "mm"],
                        ["max_prob_next_6h", d.maxProbNext6h, "%"],
                      ] as const;
                      return rows.map(([v, val, unit]) => (
                        <tr key={v} className="hover:bg-panel-deep">
                          <td className="num px-3.5 py-2 text-[11.5px] font-bold">{v}</td>
                          <td className="num px-3.5 py-2 text-[11.5px]">{val ?? "—"}</td>
                          <td className="num px-3.5 py-2 text-[11px] text-ink-faint">{unit}</td>
                          <td className="num px-3.5 py-2 text-[11px]">{fmtDateTime(d.current.time)}</td>
                          <td className="num px-3.5 py-2 text-[11px] text-ink-faint">{timeAgo(s.weather.provider.fetchedAt)}</td>
                          <td className="px-3.5 py-2"><Chip tone="neutral">forecast</Chip></td>
                          <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">grid ~15–25 km</td>
                        </tr>
                      ));
                    })()}
                </tbody>
              </table>
            </div>
          </Card>

          {/* ============ 06 · data health ============ */}
          <SectionHead no="06" title="Data health & persistence" sub="honest failure states" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                name: s.air.provider.provider,
                ok: s.air.provider.ok,
                err: s.air.provider.error,
                url: SOURCES.openMeteoAir,
              },
              {
                name: s.weather.provider.provider,
                ok: s.weather.provider.ok,
                err: s.weather.provider.error,
                url: SOURCES.openMeteoWeather,
              },
              {
                name: `Persistence · ${s.backendMode}`,
                ok: true,
                err: null as string | null,
                url: null as string | null,
              },
            ].map((p) => (
              <Card key={p.name} hard={false}>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wide">{p.name}</span>
                  <Chip tone={p.ok ? "teal" : "coral"}>{p.ok ? "ok" : "down"}</Chip>
                </div>
                <p className="num mt-2 text-[10.5px] leading-relaxed text-ink-faint">
                  {p.ok
                    ? "Live. 8 s timeout · 5 min cache · Zod-validated shape."
                    : `Failed: ${p.err}. Shown as missing — never substituted.`}
                </p>
                {p.url && (
                  <p className="mt-2">
                    <SourceLink href={p.url}>docs</SourceLink>
                  </p>
                )}
              </Card>
            ))}
          </div>

          {/* ============ 07 · how it works ============ */}
          <SectionHead no="07" title="How this works" sub="deterministic · explainable" />
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                n: "A",
                t: "Evidence layer",
                d: "Grid-scale air & weather (timestamped, sourced) plus reported incidents with evidence type, confidence and demo flags.",
              },
              {
                n: "B",
                t: "Score, not a black box",
                d: "Each dimension normalizes to 0–100 with documented transforms. Weights renormalize over available data; four explicit interaction rules add bounded, traceable bonuses.",
              },
              {
                n: "C",
                t: "Human in the loop",
                d: "Actions name an owner and a next verification step. Nothing is dispatched, filed or claimed as done — an authorized human acts in the real world.",
              },
            ].map((x) => (
              <div key={x.n} className="card hard hard-hover p-4">
                <MountDecode as="div" text={`/${x.n}`} className="num text-[11px] font-bold text-ink-faint" />
                <h3 className="mt-1.5 font-display text-[15px] font-bold">{x.t}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{x.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <Link
              href="/methodology"
              className="focus-ring inline-flex items-center gap-2 font-mono text-[11.5px] font-bold uppercase tracking-[0.12em] text-ink underline decoration-2 underline-offset-4 hover:bg-ink hover:text-white"
            >
              Read the full methodology <ArrowRight size={13} />
            </Link>
          </div>
        </>
      )}
    </main>
  );
}
