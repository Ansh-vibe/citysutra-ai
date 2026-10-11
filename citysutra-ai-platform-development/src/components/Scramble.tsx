"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cryptography-style text effect.
 *
 * - <MountDecode>  : decodes from random glyphs to the final text on mount
 * - <HoverScramble>: scrambles to random glyphs then re-decodes on hover
 *
 * Uses a hex/symbol character set. Honors prefers-reduced-motion.
 */

const CHARSET = "ABCDEF0123456789$#%&@*+<>=/\\|";

function randChar(): string {
  return CHARSET[Math.floor(Math.random() * CHARSET.length)];
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function useDecodeEngine() {
  const raf = useRef(0);

  const run = useCallback(
    (text: string, onFrame: (s: string) => void, onDone: () => void, delayMs = 0) => {
      cancelAnimationFrame(raf.current);
      if (prefersReducedMotion()) {
        onFrame(text);
        onDone();
        return;
      }
      const n = text.length;
      const duration = Math.min(850, 220 + n * 20);
      const t0 = performance.now() + delayMs;
      const step = (now: number) => {
        const t = now - t0;
        if (t < 0) {
          raf.current = requestAnimationFrame(step);
          return;
        }
        const progress = Math.min(1, t / duration);
        const locked = Math.floor(progress * n);
        let s = "";
        for (let i = 0; i < n; i++) {
          const ch = text[i];
          if (ch === " " || ch === "\n") {
            s += ch;
            continue;
          }
          s += i < locked ? ch : randChar();
        }
        if (progress >= 1) {
          onFrame(text);
          onDone();
          return;
        }
        onFrame(s);
        raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    []
  );

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return { run, cancel: () => cancelAnimationFrame(raf.current) };
}

type TagProps = {
  as?: React.ElementType;
  className?: string;
  text: string;
  delay?: number;
};

export function MountDecode({ as, className, text, delay = 0 }: TagProps) {
  const Comp: React.ElementType = as ?? "span";
  const [anim, setAnim] = useState<string | null>(null);
  const { run } = useDecodeEngine();

  useEffect(() => {
    setAnim(text.replace(/[^\s]/g, () => randChar()));
    run(text, setAnim, () => setAnim(null), delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <Comp className={className} aria-label={text}>
      {anim ?? text}
    </Comp>
  );
}

export function HoverScramble({ as, className, text, delay = 0 }: TagProps) {
  const Comp: React.ElementType = as ?? "span";
  const [anim, setAnim] = useState<string | null>(null);
  const { run, cancel } = useDecodeEngine();

  return (
    <Comp
      className={className}
      aria-label={text}
      onMouseEnter={() => run(text, setAnim, () => setAnim(null), delay)}
      onMouseLeave={() => {
        cancel();
        setAnim(null);
      }}
    >
      {anim ?? text}
    </Comp>
  );
}
