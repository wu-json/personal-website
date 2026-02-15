const linkClass =
  'font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300';

const MainBanner = () => (
  <div className='w-full h-screen bg-black flex items-center justify-center'>
    <div className='flex flex-col items-center gap-6'>
      <h1 className='text-white text-6xl font-pixel uppercase'>Jason Wu</h1>
      <div className='flex items-center gap-3'>
        <a
          href='https://github.com/wu-json'
          target='_blank'
          rel='noopener noreferrer'
          className={linkClass}
        >
          GitHub
        </a>
        <span className='text-white/20 text-xs'>/</span>
        <a
          href='https://linkedin.com/in/jasonwu'
          target='_blank'
          rel='noopener noreferrer'
          className={linkClass}
        >
          LinkedIn
        </a>
      </div>
    </div>
  </div>
);

export { MainBanner };
