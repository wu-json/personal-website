import { ProgressiveImage } from 'src/components/ProgressiveImage';
import { Link } from 'wouter';

import { heroImageUrl, heroes } from './data';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const HeroesScreen = () => (
  <div className='w-full min-h-screen bg-black md:pr-40'>
    <div className='max-w-4xl mx-auto px-6 py-16'>
      <header className='mb-16'>
        <h1
          className='bio-glitch text-white text-2xl sm:text-4xl font-pixel mb-2'
          style={jitter()}
        >
          Heroes
        </h1>
        <p
          className='bio-glitch text-white/30 text-xs font-mono uppercase tracking-widest'
          style={jitter()}
        >
          {'// army of humanity'}
        </p>
      </header>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
        {heroes.map((h, i) => (
          <Link
            key={h.id}
            to={`/heroes/${h.id}`}
            className='bio-glitch group block'
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <ProgressiveImage
              placeholderSrc={heroImageUrl(h.id, h.cover, 'placeholder')}
              src={heroImageUrl(h.id, h.cover, 'thumb')}
              width={3}
              height={2}
              loading={i < 4 ? 'eager' : 'lazy'}
              objectPosition={h.coverPosition}
              className='rounded-sm grayscale'
            />
            <div className='mt-3'>
              <h2 className='text-white text-xs sm:text-sm font-pixel uppercase tracking-wide group-hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'>
                {h.title}
              </h2>
              <div className='flex items-baseline gap-2 mt-1'>
                <span className='text-white/50 text-xs font-mono'>
                  {h.subtitle}
                </span>
                {h.location && (
                  <span className='text-white/50 text-xs font-mono'>
                    — {h.location}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export { HeroesScreen };
