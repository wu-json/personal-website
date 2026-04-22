import { SpiderLily } from '../../SpiderLily';

const linkClass =
  'font-mono text-xs uppercase tracking-widest text-white/50 hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300';

const bioClass =
  'bio-glitch text-white text-xs sm:text-sm font-pixel text-left leading-relaxed';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const MainBanner = () => {
  return (
    <div className='w-full h-screen bg-black flex items-center justify-center md:pr-40'>
      <div className='flex flex-col items-start gap-6 md:gap-8 max-w-md lg:max-w-lg px-6'>
        <div
          className='bio-glitch w-80 sm:w-88 md:w-[26rem] lg:w-[30rem]'
          style={jitter()}
        >
          {/* spider-lily-container lives on a wrapping HTML element rather
              than the <svg> itself because iOS Safari doesn't apply CSS
              `filter: drop-shadow(...)` to inline SVG roots (WebKit bug
              261806). Wrapping in a div lets the glow animation render on
              mobile Safari while keeping desktop behavior identical. */}
          <div className='spider-lily-container w-full h-auto'>
            <SpiderLily className='w-full h-auto' />
          </div>
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
              Dance + capture humans and landscapes in monochrome
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
          <span className='text-white/20 text-xs'>/</span>
          <a
            href='https://www.instagram.com/jasoncuiwu/'
            target='_blank'
            rel='noopener noreferrer'
            className={linkClass}
          >
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
};

export { MainBanner };
