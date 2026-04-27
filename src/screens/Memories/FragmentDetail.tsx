import type { ReactNode } from 'react';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { ProgressiveImage } from 'src/components/ProgressiveImage';
import { useJitter } from 'src/hooks/useJitter';
import { useNearViewport } from 'src/hooks/useNearViewport';
import { Link, useLocation } from 'wouter';

import type { Grouping, PhotoMeta } from './types';

import { GroupLightbox } from './components/GroupLightbox';
import { Lightbox } from './components/Lightbox';
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

function filesFromGridItem(item: GridItem): string[] {
  return item.kind === 'solo'
    ? [item.photo.file]
    : item.photos.map(p => p.file);
}

/**
 * Cover photo for a grid item: the photo itself for solos, the first
 * photo for groups. Used as the prev/next cell content in the
 * lightbox carousel — when the destination is a group the user sees
 * its first photo during the slide and (on commit) the route flips
 * to `GroupLightbox` which reveals the full group layout. Same
 * concession on the `GroupLightbox` side: its prev/next cells also
 * hold cover photos.
 */
function coverOf(item: GridItem): PhotoMeta {
  return item.kind === 'solo' ? item.photo : item.photos[0];
}

/**
 * Occlusion-cull a masonry tile. Renders `children` when within (or near) the
 * viewport, and a same-sized `<div>` placeholder otherwise — preserves the
 * `columns-*` masonry flow either way because the wrapper keeps its classes
 * and (initially) aspect ratio. Eager tiles (above-the-fold) skip the
 * placeholder on first render via `initialVisible` so there's no first-paint
 * flicker.
 *
 * Decoupled from `<ProgressiveImage>` because group tiles render multiple
 * images inside a flex wrapper; this shell culls the whole cell.
 *
 * Once a tile has been visible, a `ResizeObserver` caches its measured
 * `offsetHeight` and the placeholder switches from a computed `aspectRatio`
 * (an approximation that ignores `gap-*` between flex children, and for
 * `flex-1` rows mis-estimates the equal-width row height) to the exact
 * `min-height` of the live element. Mirrors `CullableBody` in `Signals/`.
 *
 * On viewport-width changes (window resize, mobile rotation, devtools
 * toggle) the cached pixel height is stale because the masonry column
 * widths reflow, so we invalidate `heightRef` on `resize`/
 * `orientationchange` and let the placeholder fall back to the computed
 * `aspectRatio` until the tile is re-measured.
 */
const CullableTile = ({
  className,
  style,
  aspectRatio,
  initialVisible,
  onClick,
  children,
}: {
  className: string;
  style?: React.CSSProperties;
  aspectRatio: number;
  initialVisible: boolean;
  onClick?: () => void;
  children: ReactNode;
}) => {
  const [ioRef, visible] = useNearViewport<HTMLDivElement>({
    initial: initialVisible,
  });
  // Stored in state (not just a ref) so width invalidations re-render the
  // placeholder — otherwise a culled tile would keep its stale pre-resize
  // inline `min-height` until visibility flipped again.
  const [height, setHeight] = useState<number | null>(null);
  const liveRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!visible) return;
    const node = liveRef.current;
    if (!node) return;
    const apply = () => {
      const h = node.offsetHeight;
      if (h > 0) setHeight(h);
    };
    if (typeof ResizeObserver === 'undefined') {
      apply();
      return;
    }
    const ro = new ResizeObserver(apply);
    ro.observe(node);
    apply();
    return () => ro.disconnect();
  }, [visible]);

  // Invalidate the cached pixel height whenever the viewport width changes
  // — masonry columns reflow at different widths, so the prior measurement
  // no longer matches. Falls back to the computed `aspectRatio` until the
  // tile re-enters the observer's expanded root rect and gets remeasured.
  // `setHeight(null)` triggers the re-render that drops the stale value.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      setHeight(null);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, []);

  const composedRef = useCallback(
    (node: HTMLDivElement | null) => {
      ioRef(node);
      liveRef.current = node;
    },
    [ioRef],
  );

  if (visible) {
    const onKeyDown = onClick
      ? (e: React.KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }
      : undefined;
    return (
      <div
        ref={composedRef}
        className={className}
        style={style}
        onClick={onClick}
        onKeyDown={onKeyDown}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
      >
        {children}
      </div>
    );
  }

  // Prefer the measured `min-height` once the tile has been visible; before
  // first measurement (or after a width invalidation), fall back to the
  // computed `aspectRatio` so the masonry column reserves roughly-correct
  // space and the page doesn't jump when off-screen tiles get IO'd in.
  const placeholderStyle: React.CSSProperties =
    height != null
      ? { ...style, minHeight: height }
      : { ...style, aspectRatio: `${aspectRatio}` };

  // Strip interactive cursor classes from the placeholder so the inert,
  // aria-hidden div doesn't show a pointer/hand cursor on hover.
  const placeholderClassName = className
    .split(/\s+/)
    .filter(c => c && c !== 'cursor-pointer')
    .join(' ');

  return (
    <div
      ref={ioRef}
      className={placeholderClassName}
      style={placeholderStyle}
      aria-hidden='true'
    />
  );
};

const FragmentDetail = ({ id, photo }: { id: string; photo?: string }) => {
  const [, navigate] = useLocation();
  const jitter = useJitter();
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

  const gridPreloadFiles = useMemo(() => {
    if (!lightboxView) return [];
    const gi = lightboxView.gridIndex;
    const files: string[] = [];
    for (let dist = 1; dist <= 3; dist++) {
      const next = (gi + dist) % gridItems.length;
      const prev = (gi - dist + gridItems.length) % gridItems.length;
      if (next !== gi) files.push(...filesFromGridItem(gridItems[next]));
      if (prev !== gi && prev !== next)
        files.push(...filesFromGridItem(gridItems[prev]));
    }
    return files;
  }, [lightboxView, gridItems]);

  // Neighbors shown in the carousel's prev / next cells. Mirrors the
  // ordering rules used by `onPrev`/`onNext` below so the slide
  // direction lands on the right destination.
  const lightboxNeighbors = useMemo(() => {
    if (!lightboxView) return { prev: null, next: null };
    const total = gridItems.length;
    if (lightboxView.kind === 'group') {
      if (total <= 1) return { prev: null, next: null };
      const gi = lightboxView.gridIndex;
      return {
        prev: coverOf(gridItems[(gi - 1 + total) % total]),
        next: coverOf(gridItems[(gi + 1) % total]),
      };
    }
    // photo
    const {
      gridIndex,
      fromGroup,
      indexInGroup,
      groupPhotos: gPhotos,
    } = lightboxView;
    if (fromGroup && gPhotos && indexInGroup !== undefined) {
      // Intra-group navigation. Boundaries return null — swiping past
      // the first/last photo of a group does not drill out to the
      // group cover (preserves the existing `Lightbox.onPrev = null`
      // boundary behavior).
      return {
        prev: indexInGroup > 0 ? gPhotos[indexInGroup - 1] : null,
        next:
          indexInGroup < gPhotos.length - 1 ? gPhotos[indexInGroup + 1] : null,
      };
    }
    if (total <= 1) return { prev: null, next: null };
    return {
      prev: coverOf(gridItems[(gridIndex - 1 + total) % total]),
      next: coverOf(gridItems[(gridIndex + 1) % total]),
    };
  }, [lightboxView, gridItems]);

  // Early return must come *after* every hook call above so the hook
  // count is stable across render paths (Rules of Hooks). Today this
  // only ever toggles via route-level remount, but a future change
  // that flips `fragment` on the same mount would otherwise reorder
  // hooks between renders.
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

  const navigateToGridItem = (gi: number) => {
    const item = gridItems[gi];
    if (item.kind === 'group') {
      navigate(`/memories/${id}/${item.groupId}`, { replace: true });
    } else {
      navigate(`/memories/${id}/${item.photo.file}`, { replace: true });
    }
  };

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
          neighbors={lightboxNeighbors}
          preloadFiles={gridPreloadFiles}
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
          neighbors={lightboxNeighbors}
          preloadFiles={[...preload, ...gridPreloadFiles]}
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
          neighbors={lightboxNeighbors}
          preloadFiles={gridPreloadFiles}
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
          <Link
            to={`/gallery/${fragment.id}`}
            className='bio-glitch text-white/30 text-[10px] font-mono uppercase tracking-widest hover:text-white hover:[text-shadow:0_0_6px_rgba(255,255,255,0.3)] transition-all duration-300 mt-3 inline-block'
            style={jitter()}
          >
            {'> view in interactive gallery'}
          </Link>
        </header>

        {fragment.description && (
          <div
            className='bio-glitch signal-prose text-white/70 text-xs sm:text-sm font-mono leading-loose mb-12'
            style={jitter()}
          >
            <Markdown>{fragment.description}</Markdown>
          </div>
        )}

        <div
          className={`columns-1 gap-3 ${fragment.photos.length > 6 ? 'sm:columns-2 lg:columns-3' : 'sm:columns-2'}`}
        >
          {gridItems.map(item => {
            if (item.kind === 'solo') {
              const { photo: p, index: i } = item;
              const smallUrl = photoUrl(fragment.id, p.file, 'small');
              const thumbUrl = photoUrl(fragment.id, p.file, 'thumb');
              const eager = i < 6;
              return (
                <CullableTile
                  key={p.file}
                  className='cursor-pointer mb-3 break-inside-avoid'
                  aspectRatio={p.width / p.height}
                  initialVisible={eager}
                  onClick={() =>
                    navigate(`/memories/${id}/${p.file}`, { replace: true })
                  }
                >
                  <ProgressiveImage
                    placeholderSrc={photoUrl(
                      fragment.id,
                      p.file,
                      'placeholder',
                    )}
                    src={thumbUrl}
                    srcSet={`${smallUrl} 480w, ${thumbUrl} 800w`}
                    sizes='(min-width: 1024px) 260px, (min-width: 640px) 50vw, 100vw'
                    width={p.width}
                    height={p.height}
                    loading={eager ? 'eager' : 'lazy'}
                    fetchPriority={i < 2 ? 'high' : undefined}
                    className='rounded-sm'
                  />
                </CullableTile>
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
            // For `flex` rows with `flex-1 min-w-0` (equal-width children),
            // the row's aspect = n / max(h_i/w_i) — the tallest child sets the
            // row height once widths are equalized. `combinedAR` (Σ w_i/h_i)
            // is the natural-width-row aspect and would mis-reserve space.
            // For column groups the aspect is 1 / Σ(h_i/w_i). For the
            // responsive `shouldStack` case we keep `combinedAR` as a rough
            // approximation since the layout flips between stacked and row.
            const groupAR =
              isRow && !shouldStack
                ? item.photos.length /
                  Math.max(...item.photos.map(p => p.height / p.width))
                : isRow
                  ? combinedAR
                  : 1 /
                    item.photos.reduce((sum, p) => sum + p.height / p.width, 0);
            const firstIdx = item.indices[0];
            const eager = firstIdx < 6;

            return (
              <CullableTile
                key={item.groupId}
                className={`cursor-pointer mb-3 break-inside-avoid ${wrapperCls}`}
                aspectRatio={groupAR}
                initialVisible={eager}
                onClick={() =>
                  navigate(`/memories/${id}/${item.groupId}`, {
                    replace: true,
                  })
                }
              >
                {item.photos.map((p, j) => {
                  const idx = item.indices[j];
                  const smallUrl = photoUrl(fragment.id, p.file, 'small');
                  const thumbUrl = photoUrl(fragment.id, p.file, 'thumb');
                  return (
                    <div key={p.file} className={itemCls}>
                      <ProgressiveImage
                        placeholderSrc={photoUrl(
                          fragment.id,
                          p.file,
                          'placeholder',
                        )}
                        src={thumbUrl}
                        srcSet={`${smallUrl} 480w, ${thumbUrl} 800w`}
                        sizes='(min-width: 1024px) 260px, (min-width: 640px) 50vw, 100vw'
                        width={p.width}
                        height={p.height}
                        loading={idx < 6 ? 'eager' : 'lazy'}
                        fetchPriority={idx < 2 ? 'high' : undefined}
                        className='rounded-sm'
                      />
                    </div>
                  );
                })}
              </CullableTile>
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
