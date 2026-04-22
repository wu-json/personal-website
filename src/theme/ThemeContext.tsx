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

// Must exceed the longest glitch-replay animation duration so the attribute
// stays on long enough for every `.bio-glitch` / `.nav-glitch-active` element
// to play through fresh.
const THEME_FLASH_MS = 400;

/**
 * Theme coordination: `theme` state and the `data-theme` attribute on <html>
 * are kept in lockstep. Flipping is instantaneous. On every change we also
 * set `data-theme-flash` on <html> for a brief window so the page-load glitch
 * effects replay — see index.css `nav-glitch-replay`.
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

    const root = document.documentElement;
    // Remove-then-add in a rAF so the browser actually restarts the animation
    // if the attribute was still present from a rapid re-toggle.
    root.removeAttribute('data-theme-flash');
    const raf = requestAnimationFrame(() => {
      root.setAttribute('data-theme-flash', '');
    });
    const timer = window.setTimeout(() => {
      root.removeAttribute('data-theme-flash');
    }, THEME_FLASH_MS);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
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
