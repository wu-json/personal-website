// Module-level cache of full-resolution image URLs that have already loaded
// once during this session. Shared between PhotoSlide and GroupSlide so a
// photo seen inside a group neighbor is still treated as "already loaded"
// when the user later opens its solo lightbox (and vice versa). The
// lightbox shell remounts on every URL change; without this cache, every
// navigate would replay the placeholder→full crossfade for an image whose
// decoded raster is already in the browser cache.
const loadedFullUrls = new Set<string>();

export { loadedFullUrls };
