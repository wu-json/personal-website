import { ProgressiveImage } from 'src/components/ProgressiveImage';
import { Link } from 'wouter';

import { fragments, photoUrl } from './data';

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const MemoriesScreen = () => (
  <div className='w-full min-h-screen bg-black md:pr-40'>
    <div className='max-w-4xl mx-auto px-6 py-16'>
      <header className='mb-16'>
        <h1
          className='bio-glitch text-white text-2xl sm:text-4xl font-pixel mb-2'
          style={jitter()}
        >
          Memories
        </h1>
        <p
          className='bio-glitch text-white/30 text-xs font-mono uppercase tracking-widest'
          style={jitter()}
        >
          {'// fragments'}
        </p>
      </header>

      <div className='grid grid-cols-1 sm:grid-cols-2 gap-6'>
        {fragments.map((f, i) => (
          <Link
            key={f.id}
            to={`/memories/${f.id}`}
            className='bio-glitch group block'
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <ProgressiveImage
              placeholderSrc={photoUrl(f.id, f.cover, 'placeholder')}
              src={photoUrl(f.id, f.cover, 'thumb')}
              width={3}
              height={2}
              loading={i < 4 ? 'eager' : 'lazy'}
              className={`rounded-sm ${f.coverClassName ?? ''}`}
            />
            <div className='mt-3'>
              <h2 className='text-white text-xs sm:text-sm font-pixel uppercase tracking-wide group-hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'>
                {f.title}
              </h2>
              <div className='flex items-baseline gap-2 mt-1'>
                <span className='text-white/30 text-[10px] font-mono'>
                  {f.date}
                </span>
                <span className='text-white/20 text-[10px] font-mono'>
                  — {f.location}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  </div>
);

export { MemoriesScreen };
