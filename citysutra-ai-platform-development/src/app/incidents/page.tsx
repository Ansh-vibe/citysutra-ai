"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { Ban, CheckCircle2, Inbox, RotateCcw, UserCheck } from "lucide-react";
import { CATEGORIES, SOURCES, STATUS_FLOW, STATUS_META } from "@/lib/config";
import { useApi, useMutate } from "@/lib/useApi";
import type { Incident, IncidentStatus } from "@/lib/types";
import {
  Bar,
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Field,
  Loading,
  Note,
  PageTitle,
  SectionHead,
  Select,
  TextArea,
  TextInput,
} from "@/components/ui";
import {
  DemoBadge,
  Provenance,
  SeverityDots,
  StatusBadge,
  TrackChip,
} from "@/components/widgets";
import { cx, fmtDateTime, timeAgo } from "@/lib/utils";

const NEXT_META: Partial<Record<IncidentStatus, { icon: React.ReactNode; label: string }>> = {
  reviewed: { icon: <UserCheck size={13} />, label: "Mark reviewed" },
  assigned: { icon: <UserCheck size={13} />, label: "Mark assigned" },
  resolved: { icon: <CheckCircle2 size={13} />, label: "Mark resolved" },
  rejected: { icon: <Ban size={13} />, label: "Reject" },
  reported: { icon: <RotateCcw size={13} />, label: "Reopen" },
};

function IncidentsView() {
  const params = useSearchParams();
  const router = useRouter();
  const selectedId = params.get("id");
  const [track, setTrack] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectErr, setRejectErr] = useState<string | null>(null);

  const query = `/api/incidents?limit=200${track ? `&track=${track}` : ""}${status ? `&status=${status}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const inc = useApi<{ ok: boolean; incidents: Incident[] }>(query, [track, status, q]);
  const patch = useMutate<
    { status: IncidentStatus; rejectReason?: string },
    { ok: boolean; incident: Incident }
  >(
    selectedId ? `/api/incidents/${selectedId}` : "/api/incidents/_noop",
    "PATCH"
  );
  const reset = useMutate<void, { ok: boolean; seeded: number }>("/api/demo/reset", "POST");

  const selected = inc.data?.incidents.find((i) => i.incidentId === selectedId) ?? null;
  const allowed = selected ? STATUS_FLOW[selected.status] : [];

  function doTransition(next: IncidentStatus) {
    if (!selected) return;
    if (next === "rejected") {
      setRejecting(true);
      setRejectErr(null);
      return;
    }
    setRejecting(false);
    patch
      .run({ status: next })
      .then(() => inc.refetch())
      .catch(() => {});
  }

  function confirmReject() {
    if (!selected) return;
    if (rejectReason.trim().length < 5) {
      setRejectErr("A rejection reason (≥ 5 characters) is required.");
      return;
    }
    patch
      .run({ status: "rejected", rejectReason: rejectReason.trim() })
      .then(() => {
        inc.refetch();
        setRejecting(false);
        setRejectReason("");
      })
      .catch(() => {});
  }

  const list = inc.data?.incidents ?? [];

  const statusCounts = (["reported", "reviewed", "assigned", "resolved", "rejected"] as const).map(
    (st) => ({ st, n: list.filter((i) => i.status === st).length })
  );

  return (
    <>
    <div className="grid gap-4 lg:grid-cols-[1fr_370px]">
      {/* list */}
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="w-44"
            aria-label="Filter by track"
          >
            <option value="">All tracks</option>
            <option value="air">Air</option>
            <option value="heatwater">Heat &amp; Water</option>
            <option value="waste">Waste &amp; Energy</option>
          </Select>
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-40"
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {(["reported", "reviewed", "assigned", "resolved", "rejected"] as const).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <TextInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, location, text…"
            className="w-56"
            aria-label="Search incidents"
          />
          <div className="ml-auto">
            <Button
              variant="outline"
              busy={reset.busy}
              onClick={() =>
                reset.run().then(() => inc.refetch()).catch(() => {})
              }
            >
              <RotateCcw size={13} /> Reset demo data
            </Button>
          </div>
        </div>

        <Card pad={false}>
          {inc.loading && !inc.data ? (
            <Loading />
          ) : inc.error ? (
            <div className="p-4">
              <ErrorState message={inc.error} onRetry={inc.refetch} />
            </div>
          ) : list.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Inbox}
                title="No incidents match"
                body="Clear the filters or submit a new report."
                action={
                  <Link href="/report" className="text-[12.5px] font-semibold text-indigo2 hover:underline">
                    + New report
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {list.map((i) => (
                <li key={i.incidentId}>
                  <Link
                    href={`/incidents?id=${i.incidentId}`}
                    className={cx(
                      "focus-ring grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 transition-colors sm:grid-cols-[auto_1fr_auto_auto]",
                      selectedId === i.incidentId
                        ? "bg-indigo-soft/60"
                        : "hover:bg-panel-deep/50"
                    )}
                  >
                    <SeverityDots severity={i.severity} />
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-ink">
                          {i.title}
                        </span>
                        {i.isDemo && <DemoBadge />}
                      </span>
                      <span className="block truncate text-[11.5px] text-ink-faint">
                        {i.locationLabel} · {CATEGORIES[i.category].label}
                      </span>
                    </span>
                    <span className="hidden sm:block">
                      <TrackChip track={i.track} />
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <StatusBadge status={i.status} />
                      <span className="num text-[10.5px] text-ink-faint">
                        {timeAgo(i.updatedAt)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* detail */}
      <div>
        {!selected ? (
          <Card title="Incident detail">
            <EmptyState
              icon={Inbox}
              title="Select an incident"
              body="Pick a row from the list to see provenance and manage its lifecycle."
            />
          </Card>
        ) : (
          <Card title="Incident detail" pad={false}>
            <div className="space-y-3.5 p-4">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <h2 className="font-display text-[15px] font-bold leading-snug">
                    {selected.title}
                  </h2>
                  {selected.isDemo && <DemoBadge />}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={selected.status} />
                  <TrackChip track={selected.track} />
                  <Chip tone="neutral">{CATEGORIES[selected.category].label}</Chip>
                </div>
              </div>

              <p className="text-[12.5px] leading-relaxed text-ink-soft">
                {selected.description}
              </p>

              <dl className="space-y-1 text-[12px]">
                <div className="flex justify-between gap-3 border-b border-line/70 py-1">
                  <dt className="text-ink-faint">ID</dt>
                  <dd className="num break-all text-right font-medium">{selected.incidentId}</dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-line/70 py-1">
                  <dt className="text-ink-faint">Location</dt>
                  <dd className="text-right font-medium">
                    {selected.locationLabel} ·{" "}
                    <span className="num">
                      {selected.latitude.toFixed(4)}, {selected.longitude.toFixed(4)}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-line/70 py-1">
                  <dt className="text-ink-faint">Severity</dt>
                  <dd>
                    <SeverityDots severity={selected.severity} />
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-line/70 py-1">
                  <dt className="text-ink-faint">Evidence</dt>
                  <dd className="font-medium">
                    {selected.evidenceType} · confidence {selected.confidence}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-line/70 py-1">
                  <dt className="text-ink-faint">Created</dt>
                  <dd className="num">{fmtDateTime(selected.createdAt)}</dd>
                </div>
                <div className="flex justify-between gap-3 py-1">
                  <dt className="text-ink-faint">Updated</dt>
                  <dd className="num">{fmtDateTime(selected.updatedAt)}</dd>
                </div>
              </dl>

              <Provenance
                providerName={selected.sourceName}
                note={`evidence: ${selected.evidenceType}`}
              />
              <Link
                href={`/map`}
                className="inline-block text-[11.5px] font-semibold text-indigo2 underline underline-offset-2"
              >
                View on map
              </Link>

              {selected.status === "rejected" && selected.rejectReason && (
                <Note tone="coral">Rejection reason: {selected.rejectReason}</Note>
              )}
              {patch.error && <Note tone="coral">{patch.error}</Note>}

              {/* lifecycle */}
              <div className="border-t border-line pt-3">
                <div className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-faint">
                  Lifecycle · {selected.status} →
                </div>
                {rejecting ? (
                  <div className="space-y-2">
                    <Field label="Rejection reason" required error={rejectErr}>
                      <TextArea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Why is this report rejected? (min 5 characters)"
                        className="min-h-[64px]"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <Button variant="danger" busy={patch.busy} onClick={confirmReject}>
                        <Ban size={13} /> Confirm rejection
                      </Button>
                      <Button variant="ghost" onClick={() => setRejecting(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {allowed.map((next) => (
                      <Button
                        key={next}
                        variant={next === "rejected" ? "outline" : next === "resolved" ? "teal" : "primary"}
                        busy={patch.busy}
                        onClick={() => doTransition(next)}
                      >
                        {NEXT_META[next]?.icon}
                        {NEXT_META[next]?.label ?? `→ ${next}`}
                      </Button>
                    ))}
                  </div>
                )}
                <p className="mt-2.5 text-[10.5px] leading-snug text-ink-faint">
                  Status changes persist in the active backend
                  {selected.isDemo ? " (demo dataset)" : ""}. They never notify an
                  authority and never claim a field action happened.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>

    {/* ============ 02 · lifecycle statistics ============ */}
    <SectionHead no="02" title="Lifecycle statistics" sub="current view" />
    <Card>
      <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
        {statusCounts.map(({ st, n }) => (
          <div key={st} className="flex items-center gap-3">
            <span className="w-24 shrink-0 font-mono text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
              {st}
            </span>
            <Bar value={list.length ? (n / list.length) * 100 : 0} color={STATUS_META[st].color} className="flex-1" />
            <span className="num w-8 shrink-0 text-right text-[11.5px] font-bold">{n}</span>
          </div>
        ))}
      </div>
      <p className="num mt-3 text-[10.5px] text-ink-faint">
        total in view: {list.length} · demo records: {list.filter((i) => i.isDemo).length}
      </p>
    </Card>

    {/* ============ 03 · audit table ============ */}
    <SectionHead no="03" title="Full audit table" sub={`${list.length} rows · scrollable`} />
    <Card pad={false}>
      <div className="max-h-[380px] overflow-auto">
        <table className="w-full min-w-[860px] border-collapse text-left">
          <thead className="sticky top-0">
            <tr className="ink-block">
              {["ID", "Title", "Location", "Track", "Sev", "Status", "Evidence", "Created", "Updated"].map((h) => (
                <th key={h} className="px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {list.map((i) => (
              <tr
                key={i.incidentId}
                onClick={() => router.replace(`/incidents?id=${i.incidentId}`)}
                className={cx("cursor-pointer hover:bg-panel-deep", selectedId === i.incidentId && "bg-panel-deep")}
              >
                <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">{i.incidentId}</td>
                <td className="px-3.5 py-2">
                  <span className="text-[12px] font-semibold">{i.title}</span>
                  {i.isDemo && <DemoBadge className="ml-1.5" />}
                </td>
                <td className="px-3.5 py-2 text-[11.5px] text-ink-soft">{i.locationLabel}</td>
                <td className="px-3.5 py-2"><TrackChip track={i.track} /></td>
                <td className="px-3.5 py-2"><SeverityDots severity={i.severity} /></td>
                <td className="px-3.5 py-2"><StatusBadge status={i.status} /></td>
                <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">
                  {i.evidenceType} · {i.confidence}
                </td>
                <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">{fmtDateTime(i.createdAt)}</td>
                <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">{timeAgo(i.updatedAt)}</td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-[12px] text-ink-faint">
                  No incidents match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
    </>
  );
}

export default function IncidentsPage() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle kicker="// 05 · incidents" title="Incidents & Lifecycle" />
          <p className="mt-1 text-[12.5px] text-ink-soft">
            reported → reviewed → assigned → resolved (or rejected with a reason).
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-faint">
          water: <a className="font-bold text-ink underline underline-offset-2" href={SOURCES.jalBoard} target="_blank" rel="noreferrer">Jal Board channel</a> — not integrated here
        </p>
      </div>
      <Suspense>
        <IncidentsView />
      </Suspense>
    </main>
  );
}
