import { useEffect } from 'react';
import { PrefetchLink } from 'src/components/PrefetchLink';
import { type RouteKey } from 'src/lib/prefetchRoute';
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
  prefetch,
  children,
}: {
  to: string;
  active: boolean;
  onClick?: () => void;
  /** If set, warm the matching lazy chunk on hover/focus/touchstart.
   *  Belt-and-suspenders with `<RoutePrefetcher />`'s idle pass — covers
   *  users who click faster than the idle callback fires. */
  prefetch?: RouteKey;
  children: React.ReactNode;
}) => {
  const className = `group flex items-center gap-1.5 font-pixel text-xs uppercase transition-all duration-300 ${active ? 'nav-glitch-active text-white [text-shadow:0_0_8px_rgba(255,255,255,0.6)]' : 'text-white/80 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)]'}`;

  const content = (
    <>
      <LunarTear active={active} />
      {children}
    </>
  );

  if (prefetch) {
    return (
      <PrefetchLink
        to={to}
        onClick={onClick}
        prefetch={prefetch}
        className={className}
      >
        {content}
      </PrefetchLink>
    );
  }

  return (
    <Link to={to} onClick={onClick} className={className}>
      {content}
    </Link>
  );
};

const Sidebar = ({
  isMobileOpen,
  onClose,
}: {
  isMobileOpen: boolean;
  onClose: () => void;
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
        prefetch='memories'
      >
        Memories
      </NavLink>
      <NavLink
        to='/constructs'
        active={pathname.startsWith('/constructs')}
        onClick={onClick}
        prefetch='constructs'
      >
        Constructs
      </NavLink>
      <NavLink
        to='/signals'
        active={pathname.startsWith('/signals')}
        onClick={onClick}
        prefetch='signals'
      >
        Signals
      </NavLink>
      <NavLink
        to='/heroes'
        active={pathname.startsWith('/heroes')}
        onClick={onClick}
        prefetch='heroes'
      >
        Heroes
      </NavLink>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <nav className='hidden md:flex flex-col items-start gap-5 w-40 px-4 h-full bg-black py-6'>
        {links()}
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
