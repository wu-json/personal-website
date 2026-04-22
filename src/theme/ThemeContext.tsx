import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { RippleOverlay } from './RippleOverlay';

type Theme = 'dark' | 'light';

type RipplePayload = {
  id: number;
  x: number;
  y: number;
  fromTheme: Theme;
  toTheme: Theme;
};

type ThemeContextValue = {
  theme: Theme;
  toggle: (origin?: { x: number; y: number }) => void;
  setTheme: (next: Theme, origin?: { x: number; y: number }) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';

/**
 * Reads the initial theme from the attribute set by the bootstrap script in
 * index.html. Falling back through localStorage and then 'dark' keeps the
 * provider resilient if the script is bypassed (tests, SSR previews, etc.).
 */
function readInitialTheme(): Theme {
  if (typeof document === 'undefined') return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return 'dark';
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Theme coordination:
 *
 * - `theme` state is the "intent" — it updates immediately on toggle and is
 *   what `useTheme()` consumers render against.
 * - The `data-theme` attribute on <html> is what actually drives the CSS
 *   palette. We flip it ~60% through the ripple animation (or immediately
 *   when reduced motion is on / no origin provided), so the visual swap is
 *   masked by the ripple wash.
 * - `RippleOverlay` is the only thing that calls into `commitThemeAttribute`
 *   (via the `onFlip` callback), which keeps the masking contract in one
 *   place.
 */
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  const [ripple, setRipple] = useState<RipplePayload | null>(null);
  const rippleIdRef = useRef(0);

  // Persist to localStorage when theme changes. We do NOT flip the
  // data-theme attribute here — that is the ripple's job.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const commitThemeAttribute = useCallback((next: Theme) => {
    document.documentElement.setAttribute('data-theme', next);
  }, []);

  const applyThemeChange = useCallback(
    (next: Theme, origin?: { x: number; y: number }) => {
      setThemeState(prev => {
        if (prev === next) return prev;

        if (!origin || prefersReducedMotion()) {
          // No ripple — flip the attribute immediately so paint matches state.
          commitThemeAttribute(next);
          return next;
        }

        const id = ++rippleIdRef.current;
        setRipple({
          id,
          x: origin.x,
          y: origin.y,
          fromTheme: prev,
          toTheme: next,
        });
        return next;
      });
    },
    [commitThemeAttribute],
  );

  const toggle = useCallback(
    (origin?: { x: number; y: number }) => {
      applyThemeChange(theme === 'dark' ? 'light' : 'dark', origin);
    },
    [theme, applyThemeChange],
  );

  const setTheme = useCallback(
    (next: Theme, origin?: { x: number; y: number }) => {
      applyThemeChange(next, origin);
    },
    [applyThemeChange],
  );

  const handleRippleFlip = useCallback(() => {
    if (ripple) commitThemeAttribute(ripple.toTheme);
  }, [ripple, commitThemeAttribute]);

  const handleRippleDone = useCallback(() => {
    setRipple(null);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {ripple && (
        <RippleOverlay
          key={ripple.id}
          x={ripple.x}
          y={ripple.y}
          toTheme={ripple.toTheme}
          onFlip={handleRippleFlip}
          onDone={handleRippleDone}
        />
      )}
    </ThemeContext.Provider>
  );
};

function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}

export { ThemeProvider, useTheme };
export type { Theme };
