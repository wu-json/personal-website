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

// Desktop-only sidebar collapse toggle. Hidden at rest; revealed when the
// sidebar (or, when collapsed, the screen's left-edge hot zone) is hovered.
// Sits at the right edge of the sidebar near the link content when
// expanded, and at the screen's left edge when collapsed. The chevron
// color flips between hardcoded white (over the always-black sidebar) and
// var(--color-ink) (over the themed main content) so it stays visible in
// both light and dark mode.
const SidebarToggle = ({
  collapsed,
  visible,
  onClick,
  onHoverChange,
}: {
  collapsed: boolean;
  visible: boolean;
  onClick: () => void;
  onHoverChange: (hovered: boolean) => void;
}) => (
  <button
    type='button'
    onClick={onClick}
    onMouseEnter={() => onHoverChange(true)}
    onMouseLeave={() => onHoverChange(false)}
    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    aria-expanded={!collapsed}
    className={`hidden md:flex fixed top-20 z-[60] justify-center items-center w-9 h-9 transition-[left] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${collapsed ? 'left-1' : 'left-[8rem]'} ${visible ? 'pointer-events-auto' : 'pointer-events-none'}`}
  >
    <svg
      width='12'
      height='16'
      viewBox='0 0 10 14'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={`${collapsed ? 'text-[var(--color-ink)]' : 'text-white'} ${visible ? `opacity-100 ${collapsed ? '[filter:drop-shadow(0_0_5px_var(--color-glow-strong))]' : '[filter:drop-shadow(0_0_5px_rgba(255,255,255,0.45))]'}` : 'opacity-0'} transition-[opacity,transform,filter,color] duration-300 ease-out ${collapsed ? 'rotate-180' : ''}`}
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
  // Sidebar nav and toggle button track hover independently so a mouseleave
  // on one doesn't override an active hover on the other when the regions
  // overlap. When the sidebar is collapsed the toggle stays visible
  // unconditionally — without the sidebar there's no other affordance to
  // signal that nav is reachable.
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [toggleHovered, setToggleHovered] = useState(false);
  const showToggle = isSidebarCollapsed || sidebarHovered || toggleHovered;

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
        onDesktopHoverChange={setSidebarHovered}
      />
      <SidebarToggle
        collapsed={isSidebarCollapsed}
        visible={showToggle}
        onClick={toggleSidebar}
        onHoverChange={setToggleHovered}
      />
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
