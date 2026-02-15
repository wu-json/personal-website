import { useState } from 'react';
import Markdown from 'react-markdown';
import { Link, useLocation } from 'wouter';

import type { Grouping, PhotoMeta } from './types';

import { Lightbox } from './components/Lightbox';
import { ProgressiveImage } from './components/ProgressiveImage';
import { fragments, photoUrl } from './data';

const layoutClasses: Record<string, { wrapper: string; item: string }> = {
  row: { wrapper: 'flex gap-1', item: 'flex-1 min-w-0' },
  column: { wrapper: 'flex flex-col gap-1', item: '' },
};

type GridItem =
  | { kind: 'solo'; photo: PhotoMeta; index: number }
  | { kind: 'group'; layout: string; photos: PhotoMeta[]; indices: number[] };

function groupPhotos(
  photos: PhotoMeta[],
  groupings?: Record<string, Grouping>,
): GridItem[] {
  const items: GridItem[] = [];
  const consumed = new Set<number>();

  for (let i = 0; i < photos.length; i++) {
    if (consumed.has(i)) continue;
    const p = photos[i];
    if (!p.group) {
      items.push({ kind: 'solo', photo: p, index: i });
      continue;
    }
    const groupId = p.group;
    const groupPhotos: PhotoMeta[] = [];
    const groupIndices: number[] = [];
    for (let j = i; j < photos.length; j++) {
      if (photos[j].group === groupId) {
        groupPhotos.push(photos[j]);
        groupIndices.push(j);
        consumed.add(j);
      }
    }
    const layout = groupings?.[groupId]?.layout ?? 'row';
    items.push({
      kind: 'group',
      layout,
      photos: groupPhotos,
      indices: groupIndices,
    });
  }
  return items;
}

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const FragmentDetail = ({ id, photo }: { id: string; photo?: string }) => {
  const [, navigate] = useLocation();
  const fragment = fragments.find(f => f.id === id);
  const initialIndex = photo
    ? (fragment?.photos.findIndex(p => p.file === photo) ?? null)
    : null;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(
    initialIndex !== null && initialIndex >= 0 ? initialIndex : null,
  );

  if (!fragment) {
    return (
      <div className='w-full min-h-screen bg-black flex items-center justify-center md:pr-40'>
        <div className='flex flex-col items-center gap-3'>
          <h1 className='bio-glitch text-white text-2xl font-pixel'>
            FRAGMENT LOST
          </h1>
          <p className='bio-glitch text-white/30 text-xs font-mono'>
            {'// memory not found in archive'}
          </p>
          <Link
            to='/memories'
            className='mt-4 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          >
            {'< return to memories'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full min-h-screen bg-black md:pr-40'>
      <div className='max-w-4xl mx-auto px-6 py-16 pb-32'>
        <Link
          to='/memories'
          className='bio-glitch inline-block mb-8 text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300'
          style={jitter()}
        >
          {'< return to memories'}
        </Link>

        <header className='mb-8 border-b border-white/5 pb-6'>
          <h1
            className='bio-glitch text-white text-xl sm:text-3xl font-pixel uppercase tracking-wide mb-3'
            style={jitter()}
          >
            {fragment.title}
          </h1>
          <div className='flex items-baseline gap-3 flex-wrap'>
            <span
              className='bio-glitch text-white/30 text-[10px] font-mono'
              style={jitter()}
            >
              {fragment.date}
            </span>
            <span
              className='bio-glitch text-white/20 text-[10px] font-mono'
              style={jitter()}
            >
              — {fragment.location}
            </span>
          </div>
        </header>

        {fragment.description && (
          <div
            className='bio-glitch transmission-prose text-white/70 text-xs sm:text-sm font-mono leading-loose mb-12'
            style={jitter()}
          >
            <Markdown>{fragment.description}</Markdown>
          </div>
        )}

        <div className='columns-1 sm:columns-2 lg:columns-3 gap-3'>
          {groupPhotos(fragment.photos, fragment.groupings).map(item => {
            if (item.kind === 'solo') {
              const { photo, index: i } = item;
              return (
                <div
                  key={photo.file}
                  className='cursor-pointer mb-3 break-inside-avoid'
                >
                  <ProgressiveImage
                    placeholderSrc={photoUrl(
                      fragment.id,
                      photo.file,
                      'placeholder',
                    )}
                    src={photoUrl(fragment.id, photo.file, 'thumb')}
                    width={photo.width}
                    height={photo.height}
                    loading={i < 6 ? 'eager' : 'lazy'}
                    className='rounded-sm'
                    onClick={() => {
                      setLightboxIndex(i);
                      navigate(`/memories/${id}/${photo.file}`, {
                        replace: true,
                      });
                    }}
                  />
                </div>
              );
            }

            const classes = layoutClasses[item.layout] ?? layoutClasses.row;
            return (
              <div
                key={item.photos.map(p => p.file).join('-')}
                className={`mb-3 break-inside-avoid ${classes.wrapper}`}
              >
                {item.photos.map((p, j) => {
                  const idx = item.indices[j];
                  return (
                    <div
                      key={p.file}
                      className={`cursor-pointer ${classes.item}`}
                    >
                      <ProgressiveImage
                        placeholderSrc={photoUrl(
                          fragment.id,
                          p.file,
                          'placeholder',
                        )}
                        src={photoUrl(fragment.id, p.file, 'thumb')}
                        width={p.width}
                        height={p.height}
                        loading={idx < 6 ? 'eager' : 'lazy'}
                        className='rounded-sm'
                        onClick={() => {
                          setLightboxIndex(idx);
                          navigate(`/memories/${id}/${p.file}`, {
                            replace: true,
                          });
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <footer className='mt-12 pt-6 border-t border-white/5'>
          <p className='text-white/20 text-[10px] font-mono uppercase tracking-widest'>
            {'// end of fragment'}
          </p>
        </footer>
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={fragment.photos}
          fragmentId={fragment.id}
          initialIndex={lightboxIndex}
          onIndexChange={i =>
            navigate(`/memories/${id}/${fragment.photos[i].file}`, {
              replace: true,
            })
          }
          onClose={() => {
            setLightboxIndex(null);
            navigate(`/memories/${id}`, { replace: true });
          }}
        />
      )}
    </div>
  );
};

export { FragmentDetail };
