import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

type Theme = 'dark' | 'light';

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (next: Theme) => void;
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

/**
 * Theme coordination: `theme` state and the `data-theme` attribute on <html>
 * are kept in lockstep. Flipping is instantaneous. On every change we also
 * briefly set `data-theme-flash-reset` on <html> for a single frame so every
 * `.bio-glitch` / `.nav-glitch-active` element on the page replays its
 * entrance glitch — see index.css.
 */
const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);
  // Skip the flash on initial mount — the page is already mid-entrance and
  // the glitch is running naturally from first paint.
  const isInitialMount = useRef(true);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Canonical CSS animation restart: apply `animation: none` via the
    // reset attribute, force a reflow so the browser commits the cleared
    // state, then drop the attribute on the next frame — the base
    // animation rules re-apply with a fresh animation-start time and play
    // exactly once.
    const root = document.documentElement;
    root.setAttribute('data-theme-flash-reset', '');
    void root.offsetWidth;
    const raf = requestAnimationFrame(() => {
      root.removeAttribute('data-theme-flash-reset');
    });

    return () => {
      cancelAnimationFrame(raf);
      root.removeAttribute('data-theme-flash-reset');
    };
  }, [theme]);

  const toggle = useCallback(() => {
    setThemeState(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, toggle, setTheme }),
    [theme, toggle, setTheme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
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
