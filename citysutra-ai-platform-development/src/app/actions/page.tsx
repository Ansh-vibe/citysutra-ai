"use client";

import { useState } from "react";
import { ListChecks } from "lucide-react";
import { useCity } from "@/components/CityProvider";
import { useApi } from "@/lib/useApi";
import type { Snapshot } from "@/server/snapshotService";
import type { ActionStatus, RecommendedAction } from "@/lib/types";
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Loading,
  Note,
  PageTitle,
  SectionHead,
} from "@/components/ui";
import { ActionCard, InteractionsList } from "@/components/widgets";
import { fmtDateTime } from "@/lib/utils";

export default function ActionsPage() {
  const { city, demoAir } = useCity();
  const snap = useApi<{ ok: boolean; snapshot: Snapshot }>(
    `/api/snapshot?lat=${city.lat}&lon=${city.lon}&demoAir=${demoAir}`,
    [city.lat, city.lon, demoAir]
  );
  const [statuses, setStatuses] = useState<Record<string, ActionStatus>>({});
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);

  const s = snap.data?.snapshot;
  const actions: RecommendedAction[] = (s?.actions ?? []).map((a) =>
    statuses[a.actionId] ? { ...a, status: statuses[a.actionId] } : a
  );
  const decided = actions.filter((a) => a.status !== "open");

  async function setStatus(actionId: string, status: ActionStatus) {
    setBusyAction(actionId);
    setLocalErr(null);
    try {
      const r = await fetch(`/api/actions/${actionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const j = (await r.json()) as { ok: boolean; error?: string };
      if (!r.ok || !j.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setStatuses((p) => ({ ...p, [actionId]: status }));
      snap.refetch();
    } catch (e) {
      setLocalErr(e instanceof Error ? e.message : "Failed to record status");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle kicker="// 03 · actions" title="Prioritized Response Queue" />
          <p className="mt-1 max-w-2xl text-[12.5px] text-ink-soft">
            Every card shows why it is prioritized, what supports it, what is missing, and
            what a human should verify next. Accept/dismiss records your decision in this
            workspace only.
          </p>
        </div>
        {s && (
          <div className="flex items-center gap-2">
            <Chip tone="ink">{actions.length} actions</Chip>
            <span className="num text-[10.5px] text-ink-faint">
              generated {fmtDateTime(s.generatedAt)} · {city.name}
            </span>
          </div>
        )}
      </div>

      <div className="mt-3">
        <Note tone="indigo">
          Recommendations never dispatch a team or notify an authority. An authorized human
          performs any real-world action and confirms outcomes separately.
        </Note>
      </div>

      {localErr && (
        <div className="mt-3">
          <Note tone="coral">{localErr}</Note>
        </div>
      )}

      {/* ============ 01 · queue ============ */}
      <SectionHead no="01" title="Queue" sub="deterministic recompute" />
      <div className="space-y-4">
        {snap.loading && !snap.data ? (
          <Card>
            <Loading label="Computing priority queue" />
          </Card>
        ) : snap.error || !s ? (
          <ErrorState message={snap.error ?? "Failed to build the queue"} onRetry={snap.refetch} />
        ) : actions.length === 0 ? (
          <Card>
            <EmptyState
              icon={ListChecks}
              title="No actions right now"
              body="No active incidents match a recommendation rule. Report an incident or reset the demo dataset from the Overview page."
            />
          </Card>
        ) : (
          actions.map((a) => (
            <ActionCard
              key={a.actionId}
              action={a}
              busyStatus={busyAction === a.actionId ? "busy" : null}
              onStatus={(st) => setStatus(a.actionId, st)}
            />
          ))
        )}
      </div>

      {actions.length > 0 && (
        <div className="mt-4 flex items-center gap-3">
          <Button variant="outline" onClick={snap.refetch} busy={snap.loading}>
            Re-run rules
          </Button>
          <span className="num text-[10.5px] text-ink-faint">
            recomputed from live grid data + incident state
          </span>
        </div>
      )}

      {/* ============ 02 · rule audit ============ */}
      <SectionHead no="02" title="Interaction rule audit" sub="all four rules, live state" />
      {s ? (
        <Card>
          <InteractionsList interactions={s.interactions} />
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-faint">
            A bonus attaches to an action only when <b>all</b> of the rule&apos;s incident
            evidence belongs to that action — so every +N point is traceable in the card
            above. Full rule definitions live in the methodology.
          </p>
        </Card>
      ) : (
        <Card>
          <Loading label="Auditing rules" />
        </Card>
      )}

      {/* ============ 03 · decision ledger ============ */}
      <SectionHead no="03" title="Decision ledger" sub={`${decided.length} recorded`} />
      <Card pad={false}>
        {decided.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ListChecks}
              title="No decisions recorded yet"
              body="Accept or dismiss an action above — your operator decision is stored in the action ledger of the active backend."
            />
          </div>
        ) : (
          <div className="max-h-[280px] overflow-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead className="sticky top-0">
                <tr className="ink-block">
                  {["Score", "Action", "Rule", "Decision", ""].map((h, i) => (
                    <th key={i} className="px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {decided.map((a) => (
                  <tr key={a.actionId} className="hover:bg-panel-deep">
                    <td className="num px-3.5 py-2 text-[11.5px] font-bold">
                      {a.priorityScore === null ? "n/a" : a.priorityScore.toFixed(1)}
                    </td>
                    <td className="px-3.5 py-2 text-[12px] font-semibold">{a.title}</td>
                    <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">{a.ruleId}</td>
                    <td className="px-3.5 py-2">
                      <Chip tone={a.status === "accepted" ? "teal" : "neutral"}>{a.status}</Chip>
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <Button variant="ghost" className="px-2 py-0.5 text-[10px]" onClick={() => setStatus(a.actionId, "open")}>
                        reset
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ============ 04 · escalation ============ */}
      <SectionHead no="04" title="Escalation & honesty notes" />
      <div className="grid gap-4 md:grid-cols-2">
        <Note tone="coral">
          Nothing in this queue triggers field dispatch, government notification or
          automated enforcement. If a rule looks wrong, the fix belongs in{" "}
          <span className="font-bold">rule definitions + weights</span> (documented in
          methodology) — not in a human guess.
        </Note>
        <Note tone="teal">
          Before/after demo: resolving the seeded burning and drainage incidents lowers the
          G dimension and de-triggers R-01/R-02 — the score change proves the model is
          explainable, not that real air improved.
        </Note>
      </div>
    </main>
  );
}
