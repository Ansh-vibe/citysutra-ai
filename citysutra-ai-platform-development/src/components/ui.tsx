"use client";

import { AlertTriangle, Loader2, RefreshCw, type LucideIcon } from "lucide-react";
import { cx } from "@/lib/utils";
import { HoverScramble } from "./Scramble";

/* ------------------------------ primitives ------------------------------ */

type BtnVariant = "primary" | "outline" | "ghost" | "danger" | "teal";

export function Button({
  variant = "primary",
  className,
  disabled,
  busy,
  type = "button",
  onClick,
  children,
  title,
}: {
  variant?: BtnVariant;
  className?: string;
  disabled?: boolean;
  busy?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  const styles: Record<BtnVariant, string> = {
    primary: "bg-ink text-white border-ink",
    outline: "bg-white text-ink border-ink",
    ghost: "bg-transparent text-ink-soft border-transparent",
    danger: "bg-coral text-white border-coral",
    teal: "bg-teal text-white border-teal",
  };
  const solid = variant !== "ghost";
  return (
    <button
      type={type}
      title={title}
      disabled={disabled || busy}
      onClick={onClick}
      className={cx(
        "focus-ring inline-flex items-center justify-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-mono text-[12px] font-semibold uppercase tracking-[0.08em] transition-all duration-100 disabled:cursor-not-allowed disabled:opacity-50",
        solid && "hard-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
        styles[variant],
        variant === "outline" && "hover:bg-ink hover:text-white",
        variant === "ghost" && "hover:bg-panel-deep hover:text-ink",
        className
      )}
    >
      {busy && <Loader2 size={13} className="animate-spin" />}
      {children}
    </button>
  );
}

const TONE_DOT: Record<string, string> = {
  neutral: "#6f6f6f",
  teal: "#0f766e",
  amber: "#b45309",
  coral: "#cf4430",
  indigo: "#4356c6",
  ink: "#0a0a0a",
};

export function Chip({
  tone = "neutral",
  children,
  className,
  title,
}: {
  tone?: "neutral" | "teal" | "amber" | "coral" | "indigo" | "ink";
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  if (tone === "ink") {
    return (
      <span
        title={title}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-[2px] border border-ink bg-ink px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white",
          className
        )}
      >
        {children}
      </span>
    );
  }
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-[2px] border border-ink bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink",
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-[1px]" style={{ background: TONE_DOT[tone] }} />
      {children}
    </span>
  );
}

export function Card({
  title,
  aside,
  children,
  className,
  pad = true,
  hard = true,
}: {
  title?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
  hard?: boolean;
}) {
  return (
    <section className={cx("card", hard && "hard", className)}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink px-4 py-2.5">
          <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
            {title}
          </h2>
          <div className="flex items-center gap-2">{aside}</div>
        </div>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function SectionHead({ no, title, sub }: { no: string; title: string; sub?: string }) {
  return (
    <div className="mb-3 mt-9 flex items-baseline gap-3">
      <span className="num text-[11px] font-semibold text-ink-faint">
        {no}
        {" //"}
      </span>
      <h2 className="font-display text-[14px] font-bold uppercase tracking-[0.14em] text-ink">
        <HoverScramble text={title} />
      </h2>
      <span className="h-px flex-1 bg-ink" aria-hidden />
      {sub && <span className="num hidden text-[10.5px] text-ink-faint md:inline">{sub}</span>}
    </div>
  );
}

export function PageTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <div className="num text-[10.5px] font-semibold uppercase tracking-[0.2em] text-ink-faint">
        {kicker}
      </div>
      <h1 className="mt-0.5 font-display text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-3xl">
        <HoverScramble text={title} />
      </h1>
    </div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  required,
  className,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-1 flex items-baseline justify-between font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-soft">
        <span>
          {label}
          {required && <span className="ml-0.5 text-coral">*</span>}
        </span>
        {hint && <span className="font-normal normal-case tracking-normal text-ink-faint">{hint}</span>}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-[11.5px] font-semibold text-coral">
          × {error}
        </span>
      )}
    </label>
  );
}

const inputCls =
  "focus-ring w-full rounded-[2px] border border-ink bg-white px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:hard-sm focus:-translate-y-[1px]";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(inputCls, props.className)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(inputCls, "min-h-[84px]", props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(inputCls, "pr-8", props.className)} />;
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="focus-ring flex items-center gap-2 text-left"
    >
      <span
        className={cx(
          "relative h-[18px] w-[34px] shrink-0 rounded-[2px] border border-ink transition-colors",
          checked ? "bg-ink" : "bg-white"
        )}
      >
        <span
          className={cx(
            "absolute top-[2px] h-[12px] w-[14px] rounded-[1px] transition-all",
            checked ? "left-[17px] bg-white" : "left-[2px] bg-ink"
          )}
        />
      </span>
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-soft">
        {label}
        {hint && (
          <span className="block font-sans text-[11px] font-normal normal-case tracking-normal text-ink-faint">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[2px] border border-ink bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cx(
            "focus-ring rounded-[1px] px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.08em] transition-colors",
            value === o.value ? "bg-ink text-white" : "text-ink-soft hover:bg-panel-deep"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ states ----------------------------------- */

export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 font-mono text-[12px] uppercase tracking-[0.1em] text-ink-faint">
      <Loader2 size={14} className="animate-spin" /> {label}…
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[2px] border-2 border-coral bg-white px-4 py-6 text-center">
      <AlertTriangle size={18} className="text-coral" />
      <p className="font-mono text-[12px] font-bold uppercase tracking-wide text-coral">
        {message}
      </p>
      <p className="max-w-sm text-[12px] text-ink-faint">
        The rest of the workspace stays usable. Check the network and retry.
      </p>
      {onRetry && (
        <Button variant="outline" onClick={onRetry} className="mt-1">
          <RefreshCw size={12} /> Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[2px] border-2 border-dashed border-ink/40 px-4 py-8 text-center">
      <Icon size={20} className="text-ink-faint" />
      <p className="font-mono text-[12px] font-bold uppercase tracking-[0.1em] text-ink-soft">
        {title}
      </p>
      {body && <p className="max-w-md text-[12.5px] text-ink-faint">{body}</p>}
      {action}
    </div>
  );
}

/* ------------------------------- data bits ------------------------------- */

export function Bar({
  value,
  color = "#0a0a0a",
  className,
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cx("h-[6px] w-full overflow-hidden rounded-[1px] border border-ink bg-white", className)}>
      <div
        className="h-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }}
      />
    </div>
  );
}

export function ScoreDisplay({
  value,
  size = "lg",
  subtitle,
}: {
  value: number | null;
  size?: "lg" | "md";
  subtitle?: string;
}) {
  const big = size === "lg";
  if (value === null) {
    return (
      <div>
        <div className={cx("font-display font-bold tracking-tight text-ink-faint", big ? "text-4xl" : "text-2xl")}>
          —
        </div>
        <div className="mt-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          Insufficient data
        </div>
      </div>
    );
  }
  const tone = value >= 70 ? "text-coral" : value >= 40 ? "text-amber" : "text-teal";
  return (
    <div>
      <div className={cx("num font-display font-bold tracking-tight", big ? "text-4xl" : "text-2xl", tone)}>
        {value.toFixed(1)}
        <span className={cx("ml-1 text-ink-faint", big ? "text-base" : "text-sm")}>/100</span>
      </div>
      {subtitle && <div className="mt-1 text-[11.5px] text-ink-faint">{subtitle}</div>}
    </div>
  );
}

export function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink/15 py-1 last:border-0">
      <dt className="shrink-0 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-faint">
        {k}
      </dt>
      <dd className="text-right text-[12.5px] font-medium text-ink">{v}</dd>
    </div>
  );
}

export function Note({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "amber" | "coral" | "teal" | "indigo";
  children: React.ReactNode;
}) {
  const accents: Record<string, string> = {
    neutral: "#0a0a0a",
    amber: "#b45309",
    coral: "#cf4430",
    teal: "#0f766e",
    indigo: "#4356c6",
  };
  return (
    <p
      className="rounded-[2px] border border-ink bg-white px-3 py-2 text-[12px] leading-relaxed text-ink-soft"
      style={{ borderLeft: `4px solid ${accents[tone]}` }}
    >
      {children}
    </p>
  );
}

export function SourceLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="focus-ring rounded font-mono text-[11.5px] font-bold text-ink underline decoration-2 underline-offset-2 hover:bg-ink hover:text-white"
    >
      {children} ↗
    </a>
  );
}
