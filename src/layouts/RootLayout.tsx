import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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

// Desktop-only sidebar collapse toggle. Reuses the LunarTear flower:
// expanded = full bloom (5 petals out), collapsed = closed bud (petals
// retract toward the center). Petals stagger so it feels like a flower
// folding/unfolding.
const SidebarToggle = ({
  collapsed,
  onClick,
}: {
  collapsed: boolean;
  onClick: () => void;
}) => (
  <button
    type='button'
    onClick={onClick}
    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    aria-expanded={!collapsed}
    className='hidden md:flex fixed top-4 left-4 z-[60] justify-center items-center w-8 h-8 group'
  >
    <svg
      width='20'
      height='20'
      viewBox='0 0 100 100'
      fill='none'
      className='menu-flower text-[var(--color-ink)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110'
    >
      {PETAL_ANGLES.map((angle, i) => (
        <ellipse
          key={angle}
          cx='50'
          cy='22'
          rx='10'
          ry='22'
          fill='currentColor'
          className='sidebar-petal'
          style={{
            transform: `rotate(${angle}deg) scale(${collapsed ? 0 : 1})`,
            opacity: collapsed ? 0 : 0.85,
            transitionDelay: collapsed
              ? `${(PETAL_ANGLES.length - 1 - i) * 50}ms`
              : `${i * 50}ms`,
          }}
        />
      ))}
      <circle
        cx='50'
        cy='50'
        r='8'
        fill='currentColor'
        className='sidebar-center'
        style={{
          transform: `scale(${collapsed ? 1.05 : 1})`,
          opacity: collapsed ? 1 : 0.95,
        }}
      />
    </svg>
  </button>
);

const SIDEBAR_COLLAPSED_KEY = 'sidebarCollapsed';

const RootLayout = ({ children }: { children: React.ReactNode }) => {
  const mainRef = useRef<HTMLElement>(null);
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
      />
      <SidebarToggle collapsed={isSidebarCollapsed} onClick={toggleSidebar} />
      <MenuToggle open={isMobileMenuOpen} onClick={toggleMobileMenu} />
      <main ref={mainRef} className='flex-1 min-w-0 overflow-y-auto'>
        {children}
      </main>
      <ScrollReset scrollRef={mainRef} />
      <ScrollToTop scrollRef={mainRef} />
    </div>
  );
};

export { RootLayout };
