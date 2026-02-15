const linkClass =
  'font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300';

const MainBanner = () => (
  <div className='w-full h-screen bg-black flex items-center justify-center md:pr-40'>
    <div className='flex flex-col items-start gap-6 md:gap-8 max-w-md lg:max-w-lg px-6'>
      <img
        src='/images/mirror.png'
        alt=''
        className='w-52 sm:w-52 md:w-64 lg:w-80 opacity-80 grayscale rotate-25'
      />
      <div className='flex flex-col gap-2.5'>
        <p className='text-white text-xs sm:text-sm font-pixel text-left leading-relaxed'>
          I make things that bloom and wilt.
        </p>
        <p className='text-white text-xs sm:text-sm font-pixel text-left leading-relaxed'>
          My latest arc has been working on coding agents at{' '}
          <a
            href='https://withforge.com/'
            target='_blank'
            rel='noopener noreferrer'
            className='underline decoration-white/30 hover:decoration-white transition-all duration-300'
          >
            Forge
          </a>
          .
        </p>
        <p className='text-white text-xs sm:text-sm font-pixel text-left leading-relaxed'>
          I did my undergrad at Yale, grew up in Princeton, lived in Atlanta,
          and ended up in San Francisco.
        </p>
        <p className='text-white text-xs sm:text-sm font-pixel text-left leading-relaxed'>
          I've been breakdancing for years, and spend my free time hiding in the streets with a camera.
        </p>
      </div>
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
          href='https://www.linkedin.com/in/wu-json/'
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
