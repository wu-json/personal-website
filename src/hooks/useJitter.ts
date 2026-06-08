'use client';

import { useId, useRef } from 'react';

/**
 * Returns a `jitter()` function whose returned `animationDelay` is
 * deterministic per call-site and stable for the lifetime of the component.
 *
 * The delay used to come from `Math.random()`, but that mismatches between
 * server SSR and client hydration in Next.js and throws a hydration warning.
 * We swap to `useId()` (identical on both sides) hashed with a per-slot
 * counter, so the produced delay is identical on the server's first paint
 * and the client's hydrate.
 *
 * Callers swap `jitter()` for a hook call at the top of the component:
 *
 *   const jitter = useJitter();
 *   …
 *   <h1 style={jitter()} />        // stable across re-renders
 *   {cond && <span style={jitter()} />}  // also fine: order isn't fixed
 */
const hash32 = (s: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h;
};

const useJitter = (maxMs = 120): (() => { animationDelay: string }) => {
  const baseId = useId();
  const indexRef = useRef(0);
  indexRef.current = 0;
  return () => {
    const i = indexRef.current++;
    const h = hash32(`${baseId}:${i}`);
    const ms = ((h % 1000) / 1000) * maxMs;
    return { animationDelay: `${ms}ms` };
  };
};

export { useJitter };
