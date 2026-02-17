import { useState } from 'react';

const linkClass =
  'font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300';

const bioClass =
  'bio-glitch text-white text-xs sm:text-sm font-pixel text-left leading-relaxed';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const MainBanner = () => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className='w-full h-screen bg-black flex items-center justify-center md:pr-40'>
      <div className='flex flex-col items-start gap-6 md:gap-8 max-w-md lg:max-w-lg px-6'>
        <div
          className='bio-glitch relative w-52 sm:w-52 md:w-64 lg:w-80 aspect-square opacity-80 grayscale rotate-25'
          style={jitter()}
        >
          <img
            src='/images/mirror-placeholder.webp'
            alt=''
            className={`w-full ${loaded ? 'opacity-0' : 'opacity-100'} blur-md transition-opacity duration-500`}
          />
          <img
            src='/images/mirror.webp'
            alt=''
            className={`absolute inset-0 w-full ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}
            onLoad={() => setLoaded(true)}
          />
        </div>
        <div className='flex flex-col gap-4'>
          <p
            className='bio-glitch text-white text-sm sm:text-base font-pixel text-left leading-relaxed [text-shadow:0_0_8px_rgba(255,255,255,0.4)]'
            style={jitter()}
          >
            {'[BLOOM AND WILT]'}
          </p>
          <div className='flex flex-col gap-2.5'>
            <p className={bioClass} style={jitter()}>
              Currently working on coding agents at{' '}
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
            <p className={bioClass} style={jitter()}>
              Yale Undergrad, grew up in Princeton, lived in Atlanta, dragged to
              San Francisco.
            </p>
            <p className={bioClass} style={jitter()}>
              Breakdance + capture humans and landscapes in monochrome
            </p>
          </div>
        </div>
        <div className='bio-glitch flex items-center gap-3' style={jitter()}>
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
};

export { MainBanner };
