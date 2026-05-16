import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { InkCursor } from 'src/components/InkCursor';
import { ScrollToTop } from 'src/components/ScrollToTop';
import { Sidebar } from 'src/components/Sidebar';
import { useLocation } from 'wouter';

const ScrollReset = ({
  scrollRef,
}: {
  scrollRef: RefObject<HTMLElement | null>;
}) => {
  const [pathname] = useLocation();
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0);
  }, [pathname, scrollRef]);
  return null;
};

const PETAL_ANGLES = [0, 72, 144, 216, 288];

const OPEN_TRANSFORMS: { transform: string; opacity: number; delay: number }[] =
  [
    {
      transform: 'rotate(45deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 0,
    },
    {
      transform: 'rotate(135deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 40,
    },
    {
      transform: 'rotate(225deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 80,
    },
    { transform: 'scale(0)', opacity: 0, delay: 0 },
    {
      transform: 'rotate(315deg) scaleX(0.4) scaleY(1.27)',
      opacity: 0.9,
      delay: 40,
    },
  ];

const MenuToggle = ({
  open,
  onClick,
}: {
  open: boolean;
  onClick: () => void;
}) => (
  <button
    type='button'
    onClick={onClick}
    aria-label={open ? 'Close menu' : 'Open menu'}
    className='fixed top-4 right-4 z-[60] flex justify-center items-center w-8 h-8 md:hidden'
  >
    <svg
      width='22'
      height='22'
      viewBox='0 0 100 100'
      fill='none'
      className={`menu-flower text-[var(--color-ink)] ${open ? '' : 'menu-flower-glow'}`}
    >
      {PETAL_ANGLES.map((angle, i) => {
        const o = OPEN_TRANSFORMS[i];
        return (
          <ellipse
            key={angle}
            cx='50'
            cy='22'
            rx='10'
            ry='22'
            fill='currentColor'
            className='menu-petal'
            style={{
              transform: open ? o.transform : `rotate(${angle}deg)`,
              opacity: open ? o.opacity : 0.85,
              transitionDelay: open ? `${o.delay}ms` : '0ms',
            }}
          />
        );
      })}
      <circle
        cx='50'
        cy='50'
        r='8'
        fill='currentColor'
        className='menu-center'
        style={{
          transform: open ? 'scale(0)' : 'scale(1)',
          opacity: open ? 0 : 1,
        }}
      />
    </svg>
  </button>
);

// Collapsed-state expand handle. Renders as a tall left-edge column with a
// chevron above a vertical "ATLAS" pixel label, turning the empty rail
// into a deliberate design element. Always rendered so its opacity can
// animate; pointer-events are disabled when the sidebar is expanded. The
// nav-glitch only fires on first paint when the sidebar boots already
// collapsed — subsequent toggles fall back to the plain opacity fade so
// flipping the sidebar doesn't feel jittery.
const ATLAS_CHARS = ['ア', 'ト', 'ラ', 'ス'];

const SidebarToggle = ({
  visible,
  onClick,
}: {
  visible: boolean;
  onClick: () => void;
}) => {
  const isFirstRenderRef = useRef(true);
  // riseKey re-mounts each Atlas character span on subsequent transitions
  // into the collapsed state, replaying the per-character rise. The glitch
  // and char-rise are mutually exclusive: glitch fires only on first paint
  // (if booting collapsed), char-rise fires only on subsequent collapses.
  const [riseKey, setRiseKey] = useState(0);

  useEffect(() => {
    if (!isFirstRenderRef.current && visible) {
      setRiseKey(k => k + 1);
    }
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
    }
  }, [visible]);

  const glitchOnLoad = visible && isFirstRenderRef.current;
  const charAnimClass = isFirstRenderRef.current ? '' : 'atlas-char-rise';

  return (
    <button
      type='button'
      onClick={onClick}
      aria-label='Expand sidebar'
      aria-expanded={!visible}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`hidden md:flex fixed top-20 left-3 z-[60] flex-col items-center gap-3 cursor-pointer transition-opacity duration-500 ease-out ${visible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'} ${glitchOnLoad ? 'nav-glitch-active' : ''}`}
    >
      <svg
        width='12'
        height='16'
        viewBox='0 0 10 14'
        fill='none'
        stroke='currentColor'
        strokeWidth='1'
        strokeLinecap='round'
        strokeLinejoin='round'
        className='text-[var(--color-ink)] [filter:drop-shadow(0_0_5px_var(--color-glow-strong))] rotate-180'
      >
        <polyline points='9 1 1 7 9 13' />
      </svg>
      <span
        aria-label='Atlas'
        className='flex flex-col items-center gap-[0.45em] font-pixel text-[13px] text-[var(--color-ink-muted)] select-none'
      >
        {ATLAS_CHARS.map((c, i) => (
          <span
            key={`${riseKey}-${i}`}
            aria-hidden
            style={{ animationDelay: `${i * 70}ms` }}
            className={charAnimClass}
          >
            {c}
          </span>
        ))}
      </span>
    </button>
  );
};

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const mainRef = useRef<HTMLElement>(null);
  const [pathname] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
  });

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(
    () => setIsMobileMenuOpen(prev => !prev),
    [],
  );
  const toggleSidebar = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  return (
    <div className='flex h-full w-full overflow-hidden'>
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        isDesktopCollapsed={isSidebarCollapsed}
        onDesktopToggle={toggleSidebar}
      />
      <SidebarToggle visible={isSidebarCollapsed} onClick={toggleSidebar} />
      <MenuToggle open={isMobileMenuOpen} onClick={toggleMobileMenu} />
      <main ref={mainRef} className='flex-1 min-w-0 overflow-y-auto'>
        {children}
      </main>
      <ScrollReset scrollRef={mainRef} />
      <ScrollToTop scrollRef={mainRef} />
      {pathname === '/' && <InkCursor />}
    </div>
  );
};

export { RootLayout };
