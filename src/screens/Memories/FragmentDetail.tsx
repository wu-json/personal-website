import { useMemo } from 'react';
import Markdown from 'react-markdown';
import { Link, useLocation } from 'wouter';

import type { Grouping, PhotoMeta } from './types';

import { GroupLightbox } from './components/GroupLightbox';
import { Lightbox } from './components/Lightbox';
import { ProgressiveImage } from './components/ProgressiveImage';
import { fragments, photoUrl } from './data';

const layoutClasses: Record<string, { wrapper: string; item: string }> = {
  row: { wrapper: 'flex gap-1', item: 'flex-1 min-w-0' },
  column: { wrapper: 'flex flex-col gap-1', item: '' },
};

type GridItem =
  | { kind: 'solo'; photo: PhotoMeta; index: number }
  | {
      kind: 'group';
      groupId: string;
      layout: string;
      caption?: string;
      photos: PhotoMeta[];
      indices: number[];
    };

function buildGridItems(
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
    const gPhotos: PhotoMeta[] = [];
    const gIndices: number[] = [];
    for (let j = i; j < photos.length; j++) {
      if (photos[j].group === groupId) {
        gPhotos.push(photos[j]);
        gIndices.push(j);
        consumed.add(j);
      }
    }
    const grouping = groupings?.[groupId];
    items.push({
      kind: 'group',
      groupId,
      layout: grouping?.layout ?? 'row',
      caption: grouping?.caption,
      photos: gPhotos,
      indices: gIndices,
    });
  }
  return items;
}

type LightboxView =
  | { kind: 'group'; groupId: string; gridIndex: number }
  | {
      kind: 'photo';
      photo: PhotoMeta;
      gridIndex: number;
      fromGroup?: string;
      indexInGroup?: number;
      groupPhotos?: PhotoMeta[];
    }
  | null;

const jitter = () => ({ animationDelay: `${Math.random() * 120}ms` });

const FragmentDetail = ({ id, photo }: { id: string; photo?: string }) => {
  const [, navigate] = useLocation();
  const fragment = fragments.find(f => f.id === id);

  const gridItems = useMemo(
    () => (fragment ? buildGridItems(fragment.photos, fragment.groupings) : []),
    [fragment],
  );

  const lightboxView = useMemo((): LightboxView => {
    if (!photo || !fragment) return null;

    if (fragment.groupings?.[photo]) {
      const gi = gridItems.findIndex(
        item => item.kind === 'group' && item.groupId === photo,
      );
      if (gi >= 0) return { kind: 'group', groupId: photo, gridIndex: gi };
    }

    const pi = fragment.photos.findIndex(p => p.file === photo);
    if (pi >= 0) {
      const p = fragment.photos[pi];
      const fromGroup =
        p.group && fragment.groupings?.[p.group] ? p.group : undefined;
      const gi = gridItems.findIndex(item => {
        if (item.kind === 'solo') return item.index === pi;
        if (item.kind === 'group') return item.indices.includes(pi);
        return false;
      });

      let indexInGroup: number | undefined;
      let groupPhotos: PhotoMeta[] | undefined;
      if (fromGroup && gi >= 0) {
        const groupItem = gridItems[gi];
        if (groupItem.kind === 'group') {
          indexInGroup = groupItem.photos.findIndex(gp => gp.file === photo);
          groupPhotos = groupItem.photos;
        }
      }

      return {
        kind: 'photo',
        photo: fragment.photos[pi],
        gridIndex: gi,
        fromGroup,
        indexInGroup,
        groupPhotos,
      };
    }

    return null;
  }, [photo, fragment, gridItems]);

  const navigateToGridItem = (gi: number) => {
    const item = gridItems[gi];
    if (item.kind === 'group') {
      navigate(`/memories/${id}/${item.groupId}`, { replace: true });
    } else {
      navigate(`/memories/${id}/${item.photo.file}`, { replace: true });
    }
  };

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

  let lightboxElement: React.ReactNode = null;

  if (lightboxView?.kind === 'group') {
    const { gridIndex } = lightboxView;
    const groupItem = gridItems[gridIndex];
    if (groupItem.kind === 'group') {
      lightboxElement = (
        <GroupLightbox
          photos={groupItem.photos}
          fragmentId={fragment.id}
          layout={groupItem.layout}
          caption={groupItem.caption}
          counter={`${gridIndex + 1} / ${gridItems.length}`}
          onClose={() => navigate(`/memories/${id}`, { replace: true })}
          onPrev={
            gridItems.length > 1
              ? () =>
                  navigateToGridItem(
                    (gridIndex - 1 + gridItems.length) % gridItems.length,
                  )
              : null
          }
          onNext={
            gridItems.length > 1
              ? () => navigateToGridItem((gridIndex + 1) % gridItems.length)
              : null
          }
          onPhotoClick={p =>
            navigate(`/memories/${id}/${p.file}`, { replace: true })
          }
        />
      );
    }
  } else if (lightboxView?.kind === 'photo') {
    const {
      photo: currentPhoto,
      gridIndex,
      fromGroup,
      indexInGroup,
      groupPhotos: gPhotos,
    } = lightboxView;

    if (fromGroup && gPhotos && indexInGroup !== undefined) {
      const prevFile = indexInGroup > 0 ? gPhotos[indexInGroup - 1].file : null;
      const nextFile =
        indexInGroup < gPhotos.length - 1
          ? gPhotos[indexInGroup + 1].file
          : null;
      const preload: string[] = [];
      if (prevFile) preload.push(prevFile);
      if (nextFile) preload.push(nextFile);

      lightboxElement = (
        <Lightbox
          photo={currentPhoto}
          fragmentId={fragment.id}
          counter={`${indexInGroup + 1} / ${gPhotos.length}`}
          onClose={() =>
            navigate(`/memories/${id}/${fromGroup}`, { replace: true })
          }
          onPrev={
            prevFile
              ? () => navigate(`/memories/${id}/${prevFile}`, { replace: true })
              : null
          }
          onNext={
            nextFile
              ? () => navigate(`/memories/${id}/${nextFile}`, { replace: true })
              : null
          }
          preloadFiles={preload}
        />
      );
    } else {
      lightboxElement = (
        <Lightbox
          photo={currentPhoto}
          fragmentId={fragment.id}
          counter={`${gridIndex + 1} / ${gridItems.length}`}
          onClose={() => navigate(`/memories/${id}`, { replace: true })}
          onPrev={
            gridItems.length > 1
              ? () =>
                  navigateToGridItem(
                    (gridIndex - 1 + gridItems.length) % gridItems.length,
                  )
              : null
          }
          onNext={
            gridItems.length > 1
              ? () => navigateToGridItem((gridIndex + 1) % gridItems.length)
              : null
          }
          preloadFiles={[]}
        />
      );
    }
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
          {gridItems.map(item => {
            if (item.kind === 'solo') {
              const { photo: p, index: i } = item;
              return (
                <div
                  key={p.file}
                  className='cursor-pointer mb-3 break-inside-avoid'
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
                    loading={i < 6 ? 'eager' : 'lazy'}
                    className='rounded-sm'
                    onClick={() =>
                      navigate(`/memories/${id}/${p.file}`, { replace: true })
                    }
                  />
                </div>
              );
            }

            const base = layoutClasses[item.layout] ?? layoutClasses.row;
            const isRow =
              item.layout === 'row' || !(item.layout in layoutClasses);
            const combinedAR = item.photos.reduce(
              (sum, p) => sum + p.width / p.height,
              0,
            );
            const shouldStack = isRow && combinedAR > 2;
            const wrapperCls = shouldStack
              ? 'flex flex-col sm:flex-row gap-1'
              : base.wrapper;
            const itemCls = shouldStack ? 'sm:flex-1 sm:min-w-0' : base.item;

            return (
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
              <div
                key={item.groupId}
                className={`cursor-pointer mb-3 break-inside-avoid ${wrapperCls}`}
                onClick={() =>
                  navigate(`/memories/${id}/${item.groupId}`, {
                    replace: true,
                  })
                }
              >
                {item.photos.map((p, j) => {
                  const idx = item.indices[j];
                  return (
                    <div key={p.file} className={itemCls}>
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

      {lightboxElement}
    </div>
  );
};

export { FragmentDetail };
