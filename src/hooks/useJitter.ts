import { useRef } from 'react';

/**
 * Returns a `jitter()` function whose returned `animationDelay` is randomized
 * once per call-site and frozen for the lifetime of the component.
 *
 * The bio-glitch intro animation plays once on mount and is only re-triggered
 * via the `data-theme-flash-reset` attribute dance in `ThemeContext`. That
 * means the old `jitter = () => ({ animationDelay: Math.random() * 120 + 'ms' })`
 * helper was burning a fresh style object and a `Math.random()` call per node
 * per render, for zero visual benefit — the animation already started with
 * whatever value was captured on mount, and subsequent values are ignored.
 *
 * Callers swap `jitter()` for a hook call at the top of the component:
 *
 *   const jitter = useJitter();
 *   …
 *   <h1 style={jitter()} />        // stable across re-renders
 *   {cond && <span style={jitter()} />}  // also fine: order isn't fixed
 *
 * Internally the hook hands out slots from a single ref-backed array, keyed
 * by the order of `jitter()` calls in the render. That tolerates conditional
 * call-sites (unlike per-node `useRef`) because the ordering only matters
 * within a single render pass, not across renders — each render rebuilds
 * from the same frozen underlying array, topping it up if a new slot is
 * requested.
 */
const useJitter = (maxMs = 120): (() => { animationDelay: string }) => {
  const slotsRef = useRef<{ animationDelay: string }[]>([]);
  const indexRef = useRef(0);
  indexRef.current = 0;
  return () => {
    const i = indexRef.current++;
    const slots = slotsRef.current;
    if (i >= slots.length) {
      slots.push({ animationDelay: `${Math.random() * maxMs}ms` });
    }
    return slots[i];
  };
};

export { useJitter };
