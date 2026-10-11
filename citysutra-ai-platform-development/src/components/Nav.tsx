"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  FileText,
  Gauge,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  ListChecks,
} from "lucide-react";
import { cx } from "@/lib/utils";
import { HoverScramble } from "./Scramble";

const LINKS = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/map", label: "Map", icon: MapIcon },
  { href: "/actions", label: "Actions", icon: ListChecks },
  { href: "/report", label: "Report", icon: MapPin },
  { href: "/incidents", label: "Incidents", icon: Activity },
  { href: "/impact", label: "Impact", icon: Gauge },
  { href: "/methodology", label: "Methodology", icon: FileText },
];

function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2.5">
      <span className="ink-block grid h-8 w-8 place-items-center rounded-[2px]">
        <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden>
          <circle cx="12" cy="13" r="7.5" fill="none" stroke="#ffffff" strokeWidth="2.6" />
          <circle cx="20" cy="13" r="7.5" fill="none" stroke="#ffffff" strokeWidth="2.6" opacity="0.55" />
          <circle cx="16" cy="20.5" r="7.5" fill="none" stroke="#ffffff" strokeWidth="2.6" opacity="0.75" />
        </svg>
      </span>
      <span className="leading-none">
        <span className="block font-mono text-[13px] font-bold tracking-[0.18em] text-ink">
          CITYSUTRA<span className="ml-1 bg-ink px-1 text-white">AI</span>
        </span>
        <span className="num mt-0.5 block text-[8.5px] uppercase tracking-[0.22em] text-ink-faint">
          urban climate action twin
        </span>
      </span>
    </Link>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const [mode, setMode] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => alive && setMode(d.backendMode ?? null))
      .catch(() => alive && setMode("offline"));
    return () => {
      alive = false;
    };
  }, []);

  const isDynamo = mode === "dynamodb";

  return (
    <header className="sticky top-0 z-[1100] border-b-2 border-ink bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        <Brand />
        <nav aria-label="Primary" className="ml-1 flex flex-1 items-center gap-0.5 overflow-x-auto">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cx(
                  "focus-ring flex shrink-0 items-center gap-1.5 rounded-[2px] px-2.5 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.1em] transition-colors",
                  active ? "bg-ink text-white" : "text-ink-soft hover:bg-ink hover:text-white"
                )}
              >
                <l.icon size={13} strokeWidth={2.4} />
                <HoverScramble text={l.label} />
              </Link>
            );
          })}
        </nav>
        <div
          className="hidden shrink-0 items-center gap-1.5 rounded-[2px] border border-ink bg-white px-2.5 py-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-soft sm:flex"
          title="Persistence backend mode"
        >
          <span
            className={cx(
              "h-2 w-2 rounded-[1px]",
              isDynamo ? "bg-teal" : mode === "offline" ? "bg-coral" : "bg-amber"
            )}
          />
          {isDynamo ? "DYNAMO" : mode === "offline" ? "CHECKING…" : "LOCAL DEMO DB"}
        </div>
      </div>
    </header>
  );
}
