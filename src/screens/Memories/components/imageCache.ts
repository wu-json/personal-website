/**
 * Module-level cache of image src strings whose bitmaps have been decoded
 * via `img.decode()`. Used by the lightboxes to skip the placeholder fade
 * on warm neighbors after a swipe.
 *
 * `warmImage(src)` kicks off a fetch + decode and resolves once the bitmap
 * is ready to paint without further work; the resolved src is recorded in
 * `decoded`. `markWarm` is the manual entry point used from real `<img>`
 * `onLoad` handlers so cold loads also populate the cache.
 *
 * Rejection (cancelled load, broken image) is swallowed — the real `<img>`
 * mount will retry on its own. We only mark warm on successful decode so
 * `isWarm` never lies.
 */

const decoded = new Set<string>();

export function warmImage(src: string): Promise<void> {
  if (decoded.has(src)) return Promise.resolve();
  if (typeof Image === 'undefined') return Promise.resolve();
  const img = new Image();
  img.decoding = 'async';
  img.fetchPriority = 'low';
  img.src = src;
  return img.decode().then(
    () => {
      decoded.add(src);
    },
    () => {
      /* swallow; will retry on real mount */
    },
  );
}

export function isWarm(src: string): boolean {
  return decoded.has(src);
}

export function markWarm(src: string): void {
  decoded.add(src);
}
