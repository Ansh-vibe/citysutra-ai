"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  Recycle,
  Sparkles,
  Thermometer,
  User,
  Wind,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { DIMENSION_META, INTERACTION_RULES, STATUS_META, TRACK_META } from "@/lib/config";
import { fmtDateTime, timeAgo } from "@/lib/utils";
import type {
  DimensionValue,
  DimensionId,
  IncidentStatus,
  PriorityResult,
  RecommendedAction,
  Track,
} from "@/lib/types";
import { Bar, Button, Chip, Note } from "./ui";
import { HoverScramble } from "./Scramble";
import { cx } from "@/lib/utils";

/* ------------------------------- badges ---------------------------------- */

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const m = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-ink bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
      <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function TrackChip({ track }: { track: Track }) {
  const m = TRACK_META[track];
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[2px] border border-ink bg-white px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
      <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: m.color }} />
      {m.label}
    </span>
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Seed record for the demonstration scenario — not a detected hotspot."
      className={cx(
        "inline-flex items-center gap-1 rounded-[2px] border border-dashed border-ink bg-amber-soft px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink",
        className
      )}
    >
      Demo
    </span>
  );
}

export function SeverityDots({ severity }: { severity: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" title={`Severity ${severity}/5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={cx("h-[7px] w-[7px] rounded-[1px] border border-ink", n <= severity ? "bg-ink" : "bg-white")}
        />
      ))}
    </span>
  );
}

/* ---------------------------- dimension tiles ---------------------------- */

const DIM_ICONS: Record<DimensionId, LucideIcon> = {
  A: Wind,
  H: Thermometer,
  W: Droplets,
  G: Recycle,
};
const DIM_COLORS: Record<DimensionId, string> = {
  A: "#4356c6",
  H: "#d97706",
  W: "#b45309",
  G: "#0f766e",
};

export function DimensionTile({
  dim,
  missingReason,
}: {
  dim?: DimensionValue;
  missingReason?: string;
}) {
  const id = dim?.id ?? "A";
  const Icon = DIM_ICONS[id];
  const color = DIM_COLORS[id];
  const missing = !dim;

  return (
    <div className="card hard hard-hover flex flex-col p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-[2px] border border-ink bg-white" style={{ color }}>
            <Icon size={15} strokeWidth={2.4} />
          </span>
          <div>
            <div className="font-mono text-[11px] font-bold tracking-[0.1em] text-ink">
              {id} · {DIMENSION_META[id].label}
            </div>
            <div className="num text-[9.5px] text-ink-faint">dimension 0–100</div>
          </div>
        </div>
        {dim?.status === "simulated" && <Chip tone="amber">Simulated</Chip>}
        {missing && <Chip tone="coral">Missing</Chip>}
      </div>

      {missing ? (
        <div className="mt-3 flex flex-1 flex-col justify-center">
          <div className="font-display text-3xl font-bold text-ink-faint">—</div>
          <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">
            {missingReason ??
              "No valid data for this dimension. Weights are renormalised over available dimensions — missing data is never treated as zero."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-2.5 flex items-end justify-between gap-2">
            <div>
              <span className="num font-display text-[34px] font-bold leading-none text-ink">
                {dim.value.toFixed(1)}
              </span>
              <span className="ml-1 text-[11px] text-ink-faint">/100</span>
            </div>
            <div className="text-right">
              <div className="num text-[13px] font-bold text-ink">
                {dim.raw.value}{" "}
                <span className="text-[10.5px] font-normal text-ink-faint">{dim.raw.unit}</span>
              </div>
              <div className="num text-[9.5px] uppercase tracking-wide text-ink-faint">{dim.raw.label}</div>
            </div>
          </div>
          <Bar value={dim.value} color={color} className="mt-2" />
          <div className="mt-2 space-y-0.5">
            <div className="num text-[10px] text-ink-faint">
              {dim.source}
              {dim.timestamp && <span> · {timeAgo(dim.timestamp)}</span>}
            </div>
            <div className="text-[10.5px] leading-snug text-ink-faint">{dim.note}</div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------------------------- priority panel ----------------------------- */

export function PriorityPanel({
  priority,
  title = "Civic Action Priority",
  compact,
}: {
  priority: PriorityResult;
  title?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-faint">
            {title}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span
              className={cx(
                "num font-display text-[52px] font-bold leading-none tracking-tight",
                priority.score === null
                  ? "text-ink-faint"
                  : priority.score >= 70
                    ? "text-coral"
                    : priority.score >= 40
                      ? "text-amber"
                      : "text-teal"
              )}
            >
              {priority.score === null ? "—" : priority.score.toFixed(1)}
              {priority.score !== null && <span className="ml-1 text-base text-ink-faint">/100</span>}
            </span>
            {priority.score !== null && (
              <span className="num text-[11px] text-ink-faint">
                base {priority.base.toFixed(1)} + bonus {priority.bonus.toFixed(1)}
              </span>
            )}
          </div>
        </div>
        {!compact && (
          <Note tone="neutral">
            Operational triage score — not an official AQI, medical-risk score or government
            warning.
          </Note>
        )}
      </div>

      {priority.score === null ? (
        <p className="mt-3 font-mono text-[12px] font-semibold text-ink-faint">
          [ INSUFFICIENT DATA — no applicable dimension has a valid value; no fabricated zero ]
        </p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {priority.components.map((c) => (
            <div key={c.dimension} className="flex items-center gap-2.5">
              <span className="w-24 shrink-0 font-mono text-[10.5px] font-bold uppercase tracking-wide text-ink-soft">
                {c.dimension} · {c.label}
              </span>
              <Bar value={c.value} color={DIM_COLORS[c.dimension]} className="flex-1" />
              <span className="num w-24 shrink-0 text-right text-[10.5px] text-ink-faint">
                {c.value.toFixed(0)} × {Math.round(c.normalizedWeight * 100)}% = {c.contribution.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {priority.renormalized && (
        <p className="mt-3 font-mono text-[11px] font-semibold text-amber">
          ⚠ {priority.note}{" "}
          {priority.missing.length > 0 && <span>Missing: {priority.missing.join(", ")}</span>}
        </p>
      )}
    </div>
  );
}

export function InteractionsList({
  interactions,
}: {
  interactions: Array<{ ruleId: string; label: string; bonus: number; triggered: boolean; evidence: string[] }>;
}) {
  return (
    <div className="space-y-2">
      {interactions.map((fx) => {
        const def = INTERACTION_RULES.find((r) => r.id === fx.ruleId);
        return (
          <div
            key={fx.ruleId}
            className={cx(
              "rounded-[2px] border px-3 py-2",
              fx.triggered ? "ink-block" : "border-ink bg-white"
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                className={cx(
                  "flex items-center gap-1.5 font-mono text-[11.5px] font-bold uppercase tracking-wide",
                  fx.triggered ? "text-white" : "text-ink"
                )}
              >
                {fx.triggered ? (
                  <AlertTriangle size={12} className="text-coral" />
                ) : (
                  <Clock size={12} className="text-ink-faint" />
                )}
                <span className={fx.triggered ? "text-white/60" : "text-ink-faint"}>{fx.ruleId}</span>
                {fx.label}
              </span>
              <span
                className={cx(
                  "rounded-[2px] border px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-[0.1em]",
                  fx.triggered ? "border-white text-white" : "border-ink text-ink-faint"
                )}
              >
                {fx.triggered ? `+${fx.bonus} applied` : "not triggered"}
              </span>
            </div>
            {def && (
              <p className={cx("mt-1 text-[11px] leading-snug", fx.triggered ? "text-white/70" : "text-ink-faint")}>
                {def.description}
              </p>
            )}
            {fx.triggered && fx.evidence.length > 0 && (
              <ul className="mt-1.5 space-y-0.5">
                {fx.evidence.map((e, i) => (
                  <li key={i} className="num text-[10.5px] text-white/90">
                    → {e}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------ action card ------------------------------ */

export function ActionCard({
  action,
  compact,
  onStatus,
  busyStatus,
}: {
  action: RecommendedAction;
  compact?: boolean;
  onStatus?: (s: "accepted" | "dismissed") => void;
  busyStatus?: string | null;
}) {
  const a = action;
  const [explained, setExplained] = useState<{
    engine: "bedrock" | "deterministic";
    text: string;
    note?: string;
    disclaimer?: string;
  } | null>(null);
  const [explainBusy, setExplainBusy] = useState(false);
  const [explainErr, setExplainErr] = useState<string | null>(null);

  async function doExplain() {
    setExplainBusy(true);
    setExplainErr(null);
    try {
      const r = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: a.title,
          ruleId: a.ruleId,
          score: a.priorityScore,
          base: a.priority.base,
          bonus: a.priority.bonus,
          components: a.priority.components.map((c) => ({
            dimension: c.dimension,
            label: c.label,
            value: c.value,
            contribution: c.contribution,
          })),
          interactions: a.priority.interactions,
          missing: a.priority.missing,
          owner: a.recommendedOwner,
          nextStep: a.recommendedNextStep,
        }),
      });
      const j = (await r.json()) as {
        ok: boolean;
        error?: string;
        engine?: "bedrock" | "deterministic";
        text?: string;
        note?: string;
        disclaimer?: string;
      };
      if (!r.ok || !j.ok || !j.text) throw new Error(j.error ?? "explanation failed");
      setExplained({
        engine: (j.engine as "bedrock" | "deterministic") ?? "deterministic",
        text: j.text,
        note: j.note,
        disclaimer: j.disclaimer,
      });
    } catch (e) {
      setExplainErr(e instanceof Error ? e.message : "explanation failed");
    } finally {
      setExplainBusy(false);
    }
  }

  return (
    <article className="card hard overflow-hidden">
      <div className="ink-block flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2.5">
        <span
          className={cx(
            "num rounded-[2px] border px-2 py-0.5 font-display text-[17px] font-bold leading-tight",
            a.priorityScore === null
              ? "border-white/40 text-white/60"
              : a.priorityScore >= 70
                ? "border-coral bg-coral text-white"
                : a.priorityScore >= 40
                  ? "border-amber bg-amber text-white"
                  : "border-teal bg-teal text-white"
          )}
        >
          {a.priorityScore === null ? "n/a" : a.priorityScore.toFixed(1)}
        </span>
        <h3 className="font-display text-[14.5px] font-bold text-white">
          <HoverScramble text={a.title} />
        </h3>
        <span className="num ml-auto flex items-center gap-1.5">
          <span className="text-[9.5px] uppercase tracking-[0.14em] text-white/50">
            rule {a.ruleId}
          </span>
          {a.affectedTracks.map((t) => (
            <span
              key={t}
              className="rounded-[2px] border border-white/50 px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide text-white"
            >
              {TRACK_META[t].label}
            </span>
          ))}
        </span>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div className="space-y-3">
          <div>
            <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
              Why prioritized
            </div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink">{a.rationale}</p>
          </div>
          {a.priority.score !== null && (
            <div className="space-y-1.5">
              {a.priority.components.map((c) => (
                <div key={c.dimension} className="flex items-center gap-2">
                  <span className="num w-16 shrink-0 text-[10px] font-bold text-ink-faint">
                    {c.dimension} {c.value.toFixed(0)}
                  </span>
                  <Bar value={c.value} color={DIM_COLORS[c.dimension]} className="flex-1" />
                  <span className="num w-12 text-right text-[10px] text-ink-faint">
                    {c.contribution.toFixed(1)}
                  </span>
                </div>
              ))}
            </div>
          )}
          {!compact && (
            <div>
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                Supporting evidence
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{a.evidenceSummary}</p>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {a.incidentIds.map((id) => (
                  <li key={id}>
                    <Link
                      href={`/incidents?id=${id}`}
                      className="num focus-ring rounded-[2px] border border-ink bg-white px-1.5 py-0.5 text-[10px] font-semibold text-ink hover:bg-ink hover:text-white"
                    >
                      {id}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* AI explanation (Bedrock optional, deterministic fallback) */}
          <div className="border-t border-ink/15 pt-3">
            <Button variant="outline" onClick={doExplain} busy={explainBusy} className="w-full sm:w-auto">
              <Sparkles size={13} />
              {explained ? "Re-explain" : "AI explain"}
            </Button>
            {explainErr && (
              <p className="mt-2 text-[11.5px] font-semibold text-coral">× {explainErr}</p>
            )}
            {explained && (
              <div className="mt-2 rounded-[2px] border border-ink bg-panel-deep/60 p-3">
                <div className="mb-1.5">
                  <Chip tone={explained.engine === "bedrock" ? "indigo" : "neutral"}>
                    {explained.engine === "bedrock" ? "Amazon Bedrock" : "deterministic template"}
                  </Chip>
                </div>
                <p className="text-[12px] leading-relaxed text-ink">{explained.text}</p>
                {explained.note && (
                  <p className="mt-1.5 text-[10.5px] text-ink-faint">{explained.note}</p>
                )}
                <p className="mt-1.5 text-[10px] text-ink-faint">{explained.disclaimer}</p>
              </div>
            )}
            <p className="mt-1.5 text-[10px] leading-snug text-ink-faint">
              Amazon Bedrock is an optional enhancement. When it is not configured, a clearly
              labeled deterministic template explains the same rule-based score.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2 rounded-[2px] border border-ink border-l-4 border-l-teal bg-white px-3 py-2">
            <User size={13} className="mt-0.5 shrink-0 text-teal" />
            <div className="text-[12px] leading-snug text-ink">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-wide">{a.recommendedOwner}</span>
              <span className="mt-0.5 block text-ink-soft">{a.recommendedNextStep}</span>
            </div>
          </div>
          {a.priority.missing.length > 0 && (
            <div>
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-amber">
                Missing data
              </div>
              <p className="num mt-0.5 text-[11px] text-ink-soft">
                {a.priority.missing.map((d) => `${d} (${DIMENSION_META[d].label})`).join(" · ")}
              </p>
            </div>
          )}
          {!compact && (
            <div>
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] text-ink-faint">
                Assumptions
              </div>
              <ul className="mt-1 space-y-0.5">
                {a.assumptions.map((x, i) => (
                  <li key={i} className="text-[11.5px] leading-snug text-ink-faint">
                    – {x}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {onStatus && (
            <div className="flex flex-wrap items-center gap-2 border-t border-ink/20 pt-3">
              <Button
                variant="teal"
                busy={busyStatus !== null}
                disabled={a.status === "accepted" || busyStatus !== null}
                onClick={() => onStatus("accepted")}
              >
                <CheckCircle2 size={13} />
                {a.status === "accepted" ? "Accepted" : "Accept"}
              </Button>
              <Button
                variant="outline"
                busy={busyStatus !== null}
                disabled={a.status === "dismissed" || busyStatus !== null}
                onClick={() => onStatus("dismissed")}
              >
                <XCircle size={13} />
                {a.status === "dismissed" ? "Dismissed" : "Dismiss"}
              </Button>
              <span className="text-[10.5px] text-ink-faint">
                Records a workspace decision only — nothing is dispatched.
              </span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* --------------------------- provenance rows ----------------------------- */

export function Provenance({
  providerName,
  fetchedAt,
  sourceUrl,
  note,
}: {
  providerName: string;
  fetchedAt?: string;
  sourceUrl?: string;
  note?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 num text-[10.5px] text-ink-faint">
      <span className="font-bold uppercase tracking-wide text-ink-soft">{providerName}</span>
      {fetchedAt && (
        <span title={fmtDateTime(fetchedAt)}>fetched {timeAgo(fetchedAt)}</span>
      )}
      {sourceUrl && (
        <a href={sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-ink underline underline-offset-2 hover:bg-ink hover:text-white">
          source ↗
        </a>
      )}
      {note && <span>{note}</span>}
    </div>
  );
}

export function MissingNote({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-[2px] border border-dashed border-ink px-3 py-2 text-[12px] text-ink-faint">
      <XCircle size={13} className="shrink-0" />
      <span>
        <b>{label}</b> unavailable — shown as missing, never as zero.
      </span>
    </div>
  );
}
