import { useEffect } from 'react';
import { Link, useLocation } from 'wouter';

const PETAL_ANGLES = [0, 72, 144, 216, 288];

const LunarTear = ({ active }: { active: boolean }) => (
  <svg
    width='14'
    height='14'
    viewBox='0 0 100 100'
    fill='none'
    className={`shrink-0 transition-opacity duration-300 ${active ? 'opacity-100 lunar-tear-active' : 'opacity-0'}`}
  >
    {PETAL_ANGLES.map((angle, i) => (
      <ellipse
        key={angle}
        cx='50'
        cy='22'
        rx='10'
        ry='22'
        fill='white'
        className={`petal petal-${i} ${active ? 'petal-active' : ''}`}
        transform={`rotate(${angle} 50 50)`}
      />
    ))}
    <circle
      cx='50'
      cy='50'
      r='8'
      fill='white'
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
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={`group flex items-center gap-1.5 font-pixel text-xs uppercase transition-all duration-300 ${active ? 'nav-glitch-active text-white [text-shadow:0_0_8px_rgba(255,255,255,0.6)]' : 'text-white/80 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)]'}`}
  >
    <LunarTear active={active} />
    {children}
  </Link>
);

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
        Jason Wu
      </NavLink>
      <NavLink
        to='/memories'
        active={pathname === '/memories'}
        onClick={onClick}
      >
        Memories
      </NavLink>
      <NavLink
        to='/constructs'
        active={pathname === '/constructs'}
        onClick={onClick}
      >
        Constructs
      </NavLink>
      <NavLink
        to='/transmissions'
        active={pathname === '/transmissions'}
        onClick={onClick}
      >
        Transmissions
      </NavLink>
      <NavLink to='/garden' active={pathname === '/garden'} onClick={onClick}>
        Garden
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
