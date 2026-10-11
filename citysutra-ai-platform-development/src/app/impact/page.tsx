"use client";

import { useMemo, useState } from "react";
import { Calculator, Eraser, FlaskConical } from "lucide-react";
import { IMPACT_DEFAULTS } from "@/lib/config";
import { computeImpact, EMPTY_IMPACT, type ImpactInputs } from "@/lib/impact";
import { Bar, Button, Card, Chip, Field, Note, PageTitle, SectionHead, TextInput } from "@/components/ui";
import { fmtNumber } from "@/lib/utils";

const SAMPLE = {
  wasteTonnesDay: "2.5",
  organicFractionPct: "45",
  diversionFractionPct: "60",
  co2ePerTonneOrganic: String(IMPACT_DEFAULTS.co2ePerTonneOrganicDivertedT),
  collectionKmDay: "42",
  routeReductionPct: "20",
  co2ePerKm: String(IMPACT_DEFAULTS.co2ePerKmCollectionKg),
  waterLeakLitresDay: "50000",
  waterRatePerKl: String(IMPACT_DEFAULTS.waterRatePerKlINR),
  biogasKwhPerTonne: "",
};

type Fields = { [K in keyof typeof SAMPLE]: string };

function num(v: string): number | null {
  if (v.trim() === "") return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

function ResultCard({ r }: { r: ReturnType<typeof computeImpact>["results"][number] }) {
  const val: number | null = r.value;
  const has = val !== null && !r.insufficient;
  const sens = r.sensitivity;
  return (
    <div className="card flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-display text-[13.5px] font-bold">{r.title}</h3>
        {has ? <Chip tone="teal">Estimate</Chip> : <Chip tone="amber">Insufficient data</Chip>}
      </div>

      {has ? (
        <>
          <div className="mt-2">
            <span className="num font-display text-3xl font-bold text-ink">
              {fmtNumber(val, (val as number) < 10 ? 2 : 1)}
            </span>
            <span className="ml-1.5 text-[12px] font-medium text-ink-faint">{r.unit}</span>
          </div>
          {sens && (
            <div className="mt-2">
              <div className="flex justify-between text-[10.5px] text-ink-faint">
                <span className="num">−25% → {fmtNumber(sens.low, 1)}</span>
                <span className="num">+25% → {fmtNumber(sens.high, 1)}</span>
              </div>
              <Bar
                value={
                  sens.high > sens.low ? ((sens.base - sens.low) / (sens.high - sens.low)) * 100 : 50
                }
                color="#0f766e"
                className="mt-0.5"
              />
            </div>
          )}
        </>
      ) : (
        <div className="mt-2 rounded-md bg-panel-deep px-3 py-2.5 text-[12px] leading-snug text-ink-soft">
          {r.insufficient}
        </div>
      )}

      <div className="mt-3 rounded-md bg-panel-deep/60 px-2.5 py-1.5">
        <div className="text-[9.5px] font-bold uppercase tracking-wide text-ink-faint">Formula</div>
        <div className="num text-[11.5px] text-ink">{r.formula}</div>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {r.inputs.map((x, i) => (
          <span key={i} className="num rounded bg-panel-deep px-1.5 py-0.5 text-[10.5px] text-ink-soft">
            {x}
          </span>
        ))}
      </div>
      <ul className="mt-2 space-y-0.5">
        {r.assumptions.map((a, i) => (
          <li key={i} className="text-[11px] leading-snug text-ink-faint">
            – {a}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ImpactPage() {
  const [f, setF] = useState<Fields>({ ...SAMPLE });

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const applyPreset = (p: Partial<Fields>) => setF((cur) => ({ ...cur, ...p }));
  const PRESETS: { id: string; label: string; note: string; values: Partial<Fields> }[] = [
    {
      id: "conservative",
      label: "Conservative",
      note: "40% diversion · 10% route cut",
      values: { diversionFractionPct: "40", routeReductionPct: "10", wasteTonnesDay: "2.0", organicFractionPct: "40" },
    },
    {
      id: "typical",
      label: "Typical",
      note: "60% diversion · 20% route cut",
      values: { ...SAMPLE },
    },
    {
      id: "aggressive",
      label: "Aggressive",
      note: "80% diversion · 35% route cut + digester",
      values: { diversionFractionPct: "80", routeReductionPct: "35", wasteTonnesDay: "3.0", organicFractionPct: "50", biogasKwhPerTonne: "100" },
    },
  ];

  const inputs: ImpactInputs = useMemo(
    () => ({
      wasteTonnesDay: num(f.wasteTonnesDay),
      organicFractionPct: num(f.organicFractionPct),
      diversionFractionPct: num(f.diversionFractionPct),
      collectionKmDay: num(f.collectionKmDay),
      routeReductionPct: num(f.routeReductionPct),
      waterLeakLitresDay: num(f.waterLeakLitresDay),
      waterRatePerKl: num(f.waterRatePerKl),
      co2ePerTonneOrganic: num(f.co2ePerTonneOrganic),
      co2ePerKm: num(f.co2ePerKm),
      biogasKwhPerTonne: num(f.biogasKwhPerTonne),
    }),
    [f]
  );

  const out = useMemo(() => computeImpact(inputs), [inputs]);
  const hasAny = out.results.some((r) => r.value !== null);

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle kicker="// 06 · impact studio" title="What-if & Circular-economy Calculator" />
          <p className="mt-1 max-w-2xl text-[12.5px] text-ink-soft">
            What-if scenario calculator for waste diversion, route efficiency and water
            recovery. Every result is an <b>estimate</b> with its formula, units, inputs,
            assumptions and sensitivity — never a measured municipal outcome.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.id} variant="outline" title={p.note} onClick={() => applyPreset(p.values)}>
              {p.label}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={() =>
              setF({
                wasteTonnesDay: "",
                organicFractionPct: "",
                diversionFractionPct: "",
                co2ePerTonneOrganic: "",
                collectionKmDay: "",
                routeReductionPct: "",
                co2ePerKm: "",
                waterLeakLitresDay: "",
                waterRatePerKl: "",
                biogasKwhPerTonne: "",
              })
            }
          >
            <Eraser size={13} /> Clear
          </Button>
        </div>
      </div>

      {!hasAny && (
        <div className="mt-4">
          <Note tone="amber">
            <FlaskConical size={12} className="mr-1 inline" />
            Insufficient data: with no inputs the calculator shows exactly that — not
            fabricated zeros or invented improvements. Enter field estimates (or load the
            sample scenario) to see what each number assumes.
          </Note>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="flex flex-col gap-3">
          <Card title="Waste diversion">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Waste volume" hint="t/day">
                <TextInput inputMode="decimal" value={f.wasteTonnesDay} onChange={set("wasteTonnesDay")} className="num" />
              </Field>
              <Field label="Organic fraction" hint="%">
                <TextInput inputMode="decimal" value={f.organicFractionPct} onChange={set("organicFractionPct")} className="num" />
              </Field>
              <Field label="Diversion fraction" hint="%">
                <TextInput inputMode="decimal" value={f.diversionFractionPct} onChange={set("diversionFractionPct")} className="num" />
              </Field>
              <Field label="CO₂e factor" hint="t CO2e/t organic">
                <TextInput inputMode="decimal" value={f.co2ePerTonneOrganic} onChange={set("co2ePerTonneOrganic")} className="num" />
              </Field>
            </div>
          </Card>
          <Card title="Collection routes">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Route distance" hint="km/day">
                <TextInput inputMode="decimal" value={f.collectionKmDay} onChange={set("collectionKmDay")} className="num" />
              </Field>
              <Field label="Route reduction" hint="%">
                <TextInput inputMode="decimal" value={f.routeReductionPct} onChange={set("routeReductionPct")} className="num" />
              </Field>
              <Field label="Per-km factor" hint="kg CO2e/km" className="col-span-2">
                <TextInput inputMode="decimal" value={f.co2ePerKm} onChange={set("co2ePerKm")} className="num" />
              </Field>
            </div>
          </Card>
          <Card title="Water recovery">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Leak flow" hint="L/day">
                <TextInput inputMode="decimal" value={f.waterLeakLitresDay} onChange={set("waterLeakLitresDay")} className="num" />
              </Field>
              <Field label="Tariff" hint="₹/kL">
                <TextInput inputMode="decimal" value={f.waterRatePerKl} onChange={set("waterRatePerKl")} className="num" />
              </Field>
            </div>
          </Card>
          <Card title="Optional · energy scenario">
            <Field label="Biodigester yield" hint="kWh per t wet waste (blank = skip)">
              <TextInput inputMode="decimal" value={f.biogasKwhPerTonne} onChange={set("biogasKwhPerTonne")} className="num" />
            </Field>
          </Card>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2">
            <Calculator size={15} className="text-ink-faint" />
            <h2 className="font-display text-[13px] font-semibold uppercase tracking-wide">
              Scenario results (recompute live)
            </h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {out.results.map((r) => (
              <ResultCard key={r.key} r={r} />
            ))}
          </div>
          <div className="mt-3 space-y-2">
            {out.notes.map((n, i) => (
              <Note key={i} tone="neutral">
                {n}
              </Note>
            ))}
            <Note tone="indigo">
              Conversion factors are user-configurable and shown per result. Defaults are
              simplified, illustrative values — validate against a local GHG protocol or
              municipal data before any publication. See{" "}
              <a href="/methodology" className="font-semibold underline">
                Methodology
              </a>
              .
            </Note>
          </div>
        </div>
      </div>

      {/* ============ 02 · assumption library ============ */}
      <SectionHead no="02" title="Assumption library" sub="all default factors, editable" />
      <Card pad={false}>
        <table className="w-full min-w-[640px] border-collapse text-left">
          <thead>
            <tr className="ink-block">
              {["Factor", "Default", "Used in", "Basis"].map((h) => (
                <th key={h} className="px-3.5 py-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.14em]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {[
              ["CO₂e per t organic diverted", `${IMPACT_DEFAULTS.co2ePerTonneOrganicDivertedT} t CO2e/t`, "Diversion", "Simplified IPCC-style CH₄ LHV default — illustrative"],
              ["CO₂e per collection-km", `${IMPACT_DEFAULTS.co2ePerKmCollectionKg} kg/km`, "Routes", "Small truck, loaded + return — illustrative"],
              ["Biodigester yield", `${IMPACT_DEFAULTS.biogasKwhPerTonneWet} kWh/t wet`, "Energy (optional)", "Only if entered; real yields vary with design & C:N"],
              ["Water tariff", `₹${IMPACT_DEFAULTS.waterRatePerKlINR}/kL`, "Water", "Illustrative municipal tariff for the monetary line"],
              ["Year length", `${IMPACT_DEFAULTS.daysPerYear} days`, "All annualized", "Calendar assumption"],
            ].map((r) => (
              <tr key={r[0]} className="hover:bg-panel-deep">
                <td className="px-3.5 py-2 text-[12px] font-semibold">{r[0]}</td>
                <td className="num px-3.5 py-2 text-[11.5px]">{r[1]}</td>
                <td className="num px-3.5 py-2 text-[10.5px] text-ink-faint">{r[2]}</td>
                <td className="px-3.5 py-2 text-[11.5px] text-ink-soft">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* ============ 03 · reading the output ============ */}
      <SectionHead no="03" title="Reading the output" sub="estimates, not measurements" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="card hard hard-hover p-4">
          <div className="num text-[10px] font-bold text-teal">ESTIMATE LABEL</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            Every computed value carries an <Chip tone="teal">estimate</Chip> badge: it is a
            scenario projection from your inputs, not a measured outcome. No methane
            reduction, energy production or CO₂ saving is claimed as real.
          </p>
        </div>
        <div className="card hard hard-hover p-4">
          <div className="num text-[10px] font-bold text-amber">INSUFFICIENT DATA</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            Missing or zero required inputs produce an explicit{" "}
            <Chip tone="amber">insufficient data</Chip> state with the exact reason — never
            a fabricated zero or invented improvement.
          </p>
        </div>
        <div className="card hard hard-hover p-4">
          <div className="num text-[10px] font-bold text-indigo2">SENSITIVITY ±25%</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">
            Each result shows low/high bands from perturbing its primary driving input by
            ±25 %, so you can see how fragile the projection is before acting on it.
          </p>
        </div>
      </div>
    </main>
  );
}
