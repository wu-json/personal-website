import { Link } from 'react-router';

const linkClass =
  'font-pixel text-sm text-white/80 hover:text-white transition-colors';

const Sidebar = () => (
  <nav className='flex flex-col items-start gap-5 w-20 pl-4 h-full bg-black border-r border-white/10 py-6'>
    <Link to='/gallery' className={linkClass}>
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

export { Sidebar };
