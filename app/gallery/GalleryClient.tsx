'use client';

import type { Fragment } from 'src/screens/Memories/types';

import dynamic from 'next/dynamic';

// Gallery is the only intentionally-split route. Its 247 kB gz
// Three.js + R3F payload would be a clear LCP regression on `/`
// for the many visitors who never enter the gallery, so we keep it
// behind dynamic-import with ssr: false (and a null fallback — the
// screen owns the whole viewport, so painting nothing during the
// fetch is fine).
const GalleryScreen = dynamic(
  () => import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
  { ssr: false, loading: () => null },
);

const GalleryClient = ({ fragment }: { fragment?: Fragment | null }) => (
  <GalleryScreen fragment={fragment} />
);

export default GalleryClient;
