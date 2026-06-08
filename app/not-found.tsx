import Link from 'next/link';

const NotFound = () => (
  <div className='w-full min-h-screen bg-black flex items-center justify-center md:pr-40'>
    <div className='flex flex-col items-center gap-3'>
      <h1 className='bio-glitch text-white text-2xl font-pixel'>SIGNAL LOST</h1>
      <p className='bio-glitch text-white/30 text-xs font-mono'>
        {'// path not found in relay logs'}
      </p>
      <Link
        href='/'
        className='mt-4 text-white/30 text-xs sm:text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
      >
        {'< return home'}
      </Link>
    </div>
  </div>
);

export default NotFound;
