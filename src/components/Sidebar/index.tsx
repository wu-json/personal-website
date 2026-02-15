import { Link, useLocation } from 'react-router';

const LunarTear = () => (
  <svg
    width='10'
    height='10'
    viewBox='0 0 10 10'
    fill='none'
    className='shrink-0'
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

const linkClass =
  'font-pixel text-sm text-white/80 hover:text-white transition-colors';

const activeLinkClass = 'font-pixel text-sm text-white transition-colors';

const Sidebar = () => {
  const { pathname } = useLocation();

  return (
    <nav className='flex flex-col items-start gap-5 w-28 px-4 h-full bg-black border-r border-white/10 py-6'>
      <Link
        to='/gallery'
        className={`flex items-center gap-1.5 ${pathname === '/gallery' ? activeLinkClass : linkClass}`}
      >
        {pathname === '/gallery' && <LunarTear />}
        Gallery
      </Link>
      <div className='mt-auto' />
      <a
        href='https://github.com/wu-json'
        target='_blank'
        rel='noopener noreferrer'
        className={linkClass}
      >
        GitHub
      </a>
      <a
        href='https://linkedin.com/in/jasonwu'
        target='_blank'
        rel='noopener noreferrer'
        className={linkClass}
      >
        LinkedIn
      </a>
    </nav>
  );
};

export { Sidebar };
