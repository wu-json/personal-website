import Markdown from 'react-markdown';
import { Link } from 'wouter';

import { transmissions } from './data';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const TransmissionsScreen = () => (
  <div className='w-full min-h-screen bg-black md:pr-40'>
    <div className='max-w-2xl mx-auto px-6 py-16'>
      <header className='mb-16'>
        <h1
          className='bio-glitch text-white text-2xl sm:text-4xl font-pixel mb-2'
          style={jitter()}
        >
          Transmissions
        </h1>
        <p
          className='bio-glitch text-white/30 text-xs font-mono uppercase tracking-widest'
          style={jitter()}
        >
          {'// stream open'}
        </p>
      </header>

      <div className='flex flex-col gap-px'>
        {transmissions.map((t, i) => (
          <article
            key={t.id}
            className='bio-glitch group border-t border-white/5 py-6'
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <div className='flex items-baseline gap-3 mb-2 flex-wrap'>
              <span className='text-white/20 text-[10px] font-mono shrink-0'>
                [{t.id}]
              </span>
              <span className='text-white/30 text-[10px] font-mono shrink-0'>
                {t.timestamp}
              </span>
              {t.location && (
                <span className='text-white/20 text-[10px] font-mono shrink-0'>
                  — {t.location}
                </span>
              )}
            </div>

            <h2 className='text-white text-xs sm:text-sm font-pixel uppercase tracking-wide mb-2'>
              {t.title}
            </h2>

            <div className='transmission-prose text-white/60 text-xs sm:text-sm font-mono leading-relaxed'>
              <Markdown>{t.body}</Markdown>
            </div>

            {t.expanded && (
              <Link
                to={`/transmissions/${t.id}`}
                className='inline-block mt-3 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
              >
                {'> expand signal'}
              </Link>
            )}
          </article>
        ))}
      </div>
    </div>
  </div>
);

export { TransmissionsScreen };
