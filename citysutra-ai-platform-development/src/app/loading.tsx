export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <div className="h-3 w-40 animate-pulse rounded-[2px] bg-ink/20" />
      <div className="mt-2 h-8 w-80 animate-pulse rounded-[2px] bg-ink/30" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-[2px] border border-ink/30 bg-ink/5"
            style={{ animationDelay: `${i * 120}ms` }}
          />
        ))}
      </div>
      <div className="mt-4 h-64 animate-pulse rounded-[2px] border border-ink/30 bg-ink/5" />
      <p className="num mt-6 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-ink-faint">
        decoding…
      </p>
    </main>
  );
}
