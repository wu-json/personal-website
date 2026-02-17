import { ProgressiveImage } from 'src/components/ProgressiveImage';
import { Link } from 'wouter';

import { constructImageUrl, constructs } from './data';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const ConstructsScreen = () => (
  <div className='w-full min-h-screen bg-black md:pr-40'>
    <div className='max-w-4xl mx-auto px-6 py-16'>
      <header className='mb-16'>
        <h1
          className='bio-glitch text-white text-2xl sm:text-4xl font-pixel mb-2'
          style={jitter()}
        >
          Constructs
        </h1>
        <p
          className='bio-glitch text-white/30 text-xs font-mono uppercase tracking-widest'
          style={jitter()}
        >
          {'// assemblies'}
        </p>
      </header>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
        {constructs.map((c, i) => (
          <Link
            key={c.id}
            to={`/constructs/${c.id}`}
            className='bio-glitch group block'
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <ProgressiveImage
              placeholderSrc={constructImageUrl(c.id, c.cover, 'placeholder')}
              src={constructImageUrl(c.id, c.cover, 'thumb')}
              width={3}
              height={2}
              loading={i < 4 ? 'eager' : 'lazy'}
              className='rounded-sm'
            />
            <div className='mt-3'>
              <h2 className='text-white text-xs sm:text-sm font-pixel uppercase tracking-wide group-hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'>
                {c.title}
              </h2>
              <div className='flex items-baseline gap-2 mt-1'>
                <span className='text-white/30 text-[10px] font-mono'>
                  {c.date}
                </span>
                <span className='text-white/20 text-[10px] font-mono'>
                  — {c.subtitle}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export { ConstructsScreen };
