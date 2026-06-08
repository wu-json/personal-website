'use client';

import Link from 'next/link';
import { useJitter } from 'src/hooks/useJitter';

import type { Signal } from './types';

import { MarkdownBody } from './MarkdownBody';

const SignalDetail = ({ signal: s }: { signal: Signal }) => {
  const jitter = useJitter();

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-2xl mx-auto px-6 py-16 pb-32'>
        <Link
          href='/signals'
          className='bio-glitch inline-block mb-8 text-white/30 text-xs sm:text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          style={jitter()}
        >
          {'< return to signals'}
        </Link>

        <header
          className={`border-b border-white/5 ${s.title ? 'mb-5 pb-4' : 'mb-4 pb-3'}`}
        >
          <div
            className={`flex items-baseline gap-3 flex-wrap ${s.title ? 'mb-2' : ''}`}
          >
            <span
              className='bio-glitch text-white/30 text-xs font-mono'
              style={jitter()}
            >
              {s.timestamp.replace(/ \/\/ /g, ' ')}
            </span>
            {s.location && (
              <span
                className='bio-glitch text-white/20 text-xs font-mono'
                style={jitter()}
              >
                — {s.location}
              </span>
            )}
          </div>
          {s.title && (
            <h1
              className='bio-glitch text-white text-xl sm:text-3xl font-pixel uppercase tracking-wide'
              style={jitter()}
            >
              {s.title}
            </h1>
          )}
        </header>

        <div
          className='bio-glitch signal-prose signal-entry text-white/70 text-sm font-mono'
          style={jitter()}
        >
          <MarkdownBody>{s.body}</MarkdownBody>
        </div>

        <footer className='mt-12 pt-6 border-t border-white/5'>
          <p className='text-white/20 text-xs sm:text-[10px] font-mono uppercase tracking-widest'>
            {'// end'}
          </p>
        </footer>
      </div>
    </div>
  );
};

export { SignalDetail };
