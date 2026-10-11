import Link from "next/link";
import { Compass } from "lucide-react";
import { MountDecode } from "@/components/Scramble";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-20 text-center">
      <Compass size={28} className="text-ink" />
      <div className="num mt-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-ink-faint">
        error 404 {"//"} route not found
      </div>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight">
        <MountDecode text="This part of the twin doesn't exist." />
      </h1>
      <p className="mt-2 text-[13.5px] text-ink-soft">
        The coordinates resolved to nothing.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-[2px] border border-ink bg-ink px-5 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] text-white transition-all hover:bg-white hover:text-ink"
      >
        Back to overview
      </Link>
    </main>
  );
}
