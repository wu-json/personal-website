import Markdown from 'react-markdown';
import { Link } from 'wouter';

import { constructs } from './data';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const ConstructDetail = ({ id }: { id: string }) => {
  const c = constructs.find(x => x.id === id);

  if (!c) {
    return (
      <div className='w-full min-h-screen bg-black flex items-center justify-center md:pr-40'>
        <div className='flex flex-col items-center gap-3'>
          <h1 className='bio-glitch text-white text-2xl font-pixel'>
            CONSTRUCT LOST
          </h1>
          <p className='bio-glitch text-white/30 text-xs font-mono'>
            {'// assembly not found in archive'}
          </p>
          <Link
            to='/constructs'
            className='mt-4 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          >
            {'< return to constructs'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-2xl mx-auto px-6 py-16 pb-32'>
        <Link
          to='/constructs'
          className='bio-glitch inline-block mb-8 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          style={jitter()}
        >
          {'< return to constructs'}
        </Link>

        <header className='mb-8 border-b border-white/5 pb-6'>
          <h1
            className='bio-glitch text-white text-xl sm:text-3xl font-pixel uppercase tracking-wide mb-3'
            style={jitter()}
          >
            {c.title}
          </h1>
          <div className='flex items-baseline gap-3 flex-wrap'>
            <span
              className='bio-glitch text-white/30 text-[10px] font-mono'
              style={jitter()}
            >
              {c.date}
            </span>
            <span
              className='bio-glitch text-white/20 text-[10px] font-mono'
              style={jitter()}
            >
              — {c.subtitle}
            </span>
            {c.repo && (
              <a
                href={c.repo}
                target='_blank'
                rel='noopener noreferrer'
                className='bio-glitch text-white/30 text-[10px] font-mono hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
                style={jitter()}
              >
                [source]
              </a>
            )}
          </div>
        </header>

        <div
          className='bio-glitch transmission-prose text-white/70 text-xs sm:text-sm font-mono leading-loose'
          style={jitter()}
        >
          <Markdown>{c.body}</Markdown>
        </div>

        <footer className='mt-12 pt-6 border-t border-white/5'>
          <p className='text-white/20 text-[10px] font-mono uppercase tracking-widest'>
            {'// end of construct'}
          </p>
        </footer>
      </div>
    </div>
  );
};

export { ConstructDetail };
