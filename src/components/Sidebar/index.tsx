import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';

const PETAL_ANGLES = [0, 72, 144, 216, 288];

const LunarTear = ({ active }: { active: boolean }) => (
  <svg
    width='14'
    height='14'
    viewBox='0 0 100 100'
    fill='none'
    className={`shrink-0 transition-opacity duration-300 text-[var(--color-ink)] ${active ? 'opacity-100 lunar-tear-active' : 'opacity-0'}`}
  >
    {PETAL_ANGLES.map((angle, i) => (
      <ellipse
        key={angle}
        cx='50'
        cy='22'
        rx='10'
        ry='22'
        fill='currentColor'
        className={`petal petal-${i} ${active ? 'petal-active' : ''}`}
        transform={`rotate(${angle} 50 50)`}
      />
    ))}
    <circle
      cx='50'
      cy='50'
      r='8'
      fill='currentColor'
      className={active ? 'center-active' : 'opacity-0'}
    />
  </svg>
);

const NavLink = ({
  to,
  active,
  onClick,
  children,
}: {
  to: string;
  active: boolean;
  onClick?: () => void;
  children: React.ReactNode;
}) => {
  const className = `group flex items-center gap-1.5 font-pixel text-sm md:text-xs uppercase whitespace-nowrap transition-all duration-300 ${active ? 'nav-glitch-active text-white [text-shadow:0_0_8px_rgba(255,255,255,0.6)]' : 'text-white/80 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)]'}`;

  return (
    <Link to={to} onClick={onClick} className={className}>
      <LunarTear active={active} />
      {children}
    </Link>
  );
};

// Collapse action styled as a dimmer sibling of the nav links so it reads
// as a footer/utility item rather than a route. Pinned to the bottom of
// the nav column with mt-auto.
const CollapseLink = ({ onClick }: { onClick: () => void }) => (
  <button
    type='button'
    onClick={onClick}
    aria-label='Collapse sidebar'
    className='mt-auto group flex items-center gap-1.5 font-pixel text-sm md:text-xs uppercase whitespace-nowrap transition-all duration-300 text-white/45 hover:text-white/85 hover:[text-shadow:0_0_6px_rgba(255,255,255,0.25)]'
  >
    <svg
      width='12'
      height='12'
      viewBox='0 0 10 14'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      className='shrink-0'
    >
      <polyline points='6 1 2 7 6 13' />
    </svg>
    Collapse
  </button>
);

const Sidebar = ({
  isMobileOpen,
  onClose,
  isDesktopCollapsed,
  onDesktopToggle,
}: {
  isMobileOpen: boolean;
  onClose: () => void;
  isDesktopCollapsed: boolean;
  onDesktopToggle: () => void;
}) => {
  const [pathname] = useLocation();

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const links = (onClick?: () => void) => (
    <>
      <NavLink to='/' active={pathname === '/'} onClick={onClick}>
        Jason Cui Wu
      </NavLink>
      <NavLink
        to='/memories'
        active={pathname.startsWith('/memories')}
        onClick={onClick}
      >
        Memories
      </NavLink>
      <NavLink
        to='/constructs'
        active={pathname.startsWith('/constructs')}
        onClick={onClick}
      >
        Constructs
      </NavLink>
      <NavLink
        to='/signals'
        active={pathname.startsWith('/signals')}
        onClick={onClick}
      >
        Signals
      </NavLink>
      <NavLink
        to='/heroes'
        active={pathname.startsWith('/heroes')}
        onClick={onClick}
      >
        Heroes
      </NavLink>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <nav
        aria-hidden={isDesktopCollapsed}
        className={`hidden md:flex flex-col px-4 py-6 h-full bg-black overflow-hidden transition-[width] duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] ${isDesktopCollapsed ? 'w-0' : 'w-40'}`}
      >
        <div
          className={`flex-1 flex flex-col items-start gap-5 transition-[opacity,transform] duration-300 ease-out ${isDesktopCollapsed ? 'opacity-0 -translate-x-2 pointer-events-none' : 'opacity-100 translate-x-0 delay-150'}`}
        >
          {links()}
          <CollapseLink onClick={onDesktopToggle} />
        </div>
      </nav>

      {/* Mobile overlay */}
      <nav
        className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black transition-opacity duration-300 md:hidden ${isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {links(onClose)}
      </nav>
    </>
  );
};

export { Sidebar };
