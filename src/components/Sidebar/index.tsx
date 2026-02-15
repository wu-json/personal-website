import { Link, useLocation } from 'react-router';

const LunarTear = ({ active }: { active: boolean }) => (
  <svg
    width='10'
    height='10'
    viewBox='0 0 10 10'
    fill='none'
    className={`shrink-0 transition-all duration-500 ${active ? 'opacity-100 scale-100 rotate-0 lunar-tear-active' : 'opacity-0 scale-0 rotate-180'}`}
  >
    <circle cx='5' cy='5' r='1.2' fill='white' />
    <ellipse cx='5' cy='2' rx='1' ry='2' fill='white' opacity='0.9' />
    <ellipse cx='5' cy='8' rx='1' ry='2' fill='white' opacity='0.9' />
    <ellipse cx='2' cy='5' rx='2' ry='1' fill='white' opacity='0.9' />
    <ellipse cx='8' cy='5' rx='2' ry='1' fill='white' opacity='0.9' />
    <ellipse
      cx='3'
      cy='3'
      rx='1'
      ry='1.8'
      fill='white'
      opacity='0.7'
      transform='rotate(45 3 3)'
    />
    <ellipse
      cx='7'
      cy='3'
      rx='1'
      ry='1.8'
      fill='white'
      opacity='0.7'
      transform='rotate(-45 7 3)'
    />
    <ellipse
      cx='3'
      cy='7'
      rx='1'
      ry='1.8'
      fill='white'
      opacity='0.7'
      transform='rotate(-45 3 7)'
    />
    <ellipse
      cx='7'
      cy='7'
      rx='1'
      ry='1.8'
      fill='white'
      opacity='0.7'
      transform='rotate(45 7 7)'
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
