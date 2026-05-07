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

// Desktop-only sidebar collapse toggle. Sits in the gutter at the right
// edge of the sidebar so it never collides with the link column or the
// active-route LunarTear marker. When the sidebar collapses, the toggle
// slides over to the screen's left edge so it remains reachable.
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
    className={`hidden md:flex fixed top-1/2 -translate-y-1/2 z-[60] justify-center items-center w-7 h-10 group transition-[left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'left-0' : 'left-[8.5rem]'}`}
  >
    <svg
      width='10'
      height='14'
      viewBox='0 0 10 14'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.25'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={`text-white/35 group-hover:text-white/90 group-hover:[filter:drop-shadow(0_0_5px_rgba(255,255,255,0.45))] transition-[transform,color,filter] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${collapsed ? 'rotate-180' : ''}`}
    >
      <polyline points='6 1 2 7 6 13' />
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
