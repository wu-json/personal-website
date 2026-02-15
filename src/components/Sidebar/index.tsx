import { Link, useLocation } from 'react-router';

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
  children,
}: {
  to: string;
  active: boolean;
  children: React.ReactNode;
}) => (
  <Link
    to={to}
    className={`group flex items-center gap-1.5 font-pixel text-sm transition-all duration-300 ${active ? 'text-white [text-shadow:0_0_8px_rgba(255,255,255,0.6)]' : 'text-white/80 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)]'}`}
  >
    <LunarTear active={active} />
    {children}
  </Link>
);

const Sidebar = () => {
  const { pathname } = useLocation();

  return (
    <nav className='flex flex-col items-start gap-5 w-28 px-4 h-full bg-black border-r border-white/10 py-6'>
      <NavLink to='/gallery' active={pathname === '/gallery'}>
        Gallery
      </NavLink>
      <NavLink to='/blog' active={pathname === '/blog'}>
        Blog
      </NavLink>
      <div className='mt-auto' />
      <a
        href='https://github.com/wu-json'
        target='_blank'
        rel='noopener noreferrer'
        className='font-pixel text-sm text-white/80 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
      >
        GitHub
      </a>
      <a
        href='https://linkedin.com/in/jasonwu'
        target='_blank'
        rel='noopener noreferrer'
        className='font-pixel text-sm text-white/80 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
      >
        LinkedIn
      </a>
    </nav>
  );
};

export { Sidebar };
