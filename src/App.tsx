import { lazy, Suspense } from 'react';
import { RootLayout } from 'src/layouts/RootLayout';
import { loaders } from 'src/lib/prefetchRoute';
import { HomeScreen } from 'src/screens/Home';
import { Route, Switch } from 'wouter';

// Gallery is its own entry (bypasses RootLayout, not prefetched — 887 kB
// Three.js chunk is too heavy to warm speculatively).
const GalleryScreen = lazy(() =>
  import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
);

// Every other lazy screen routes through `loaders` so the prefetch
// registry and `lazy()` share one set of module specifiers (no drift).
const MemoriesScreen = lazy(() =>
  loaders.memories().then(m => ({ default: m.MemoriesScreen })),
);
const FragmentDetail = lazy(() =>
  loaders.memoriesDetail().then(m => ({ default: m.FragmentDetail })),
);
const SignalsScreen = lazy(() =>
  loaders.signals().then(m => ({ default: m.SignalsScreen })),
);
const SignalDetail = lazy(() =>
  loaders.signalsDetail().then(m => ({ default: m.SignalDetail })),
);
const ConstructsScreen = lazy(() =>
  loaders.constructs().then(m => ({ default: m.ConstructsScreen })),
);
const ConstructDetail = lazy(() =>
  loaders.constructsDetail().then(m => ({ default: m.ConstructDetail })),
);
const HeroesScreen = lazy(() =>
  loaders.heroes().then(m => ({ default: m.HeroesScreen })),
);
const HeroDetail = lazy(() =>
  loaders.heroesDetail().then(m => ({ default: m.HeroDetail })),
);

/** Full-viewport black backdrop shown during lazy-chunk fetch. Matches the
 *  `bg-black` that every screen renders so there is no flash of white. */
const RouteFallback = () => <div className='w-full min-h-screen bg-black' />;

const App = () => (
  <Switch>
    <Route path='/gallery/:fragmentId'>
      {params => (
        <Suspense fallback={null}>
          <GalleryScreen fragmentId={params.fragmentId} />
        </Suspense>
      )}
    </Route>
    {/* Dev-only: standalone gallery for testing layout without a fragment */}
    {import.meta.env.DEV && (
      <Route path='/gallery'>
        <Suspense fallback={null}>
          <GalleryScreen />
        </Suspense>
      </Route>
    )}
    <Route>
      <RootLayout>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path='/' component={HomeScreen} />
            <Route path='/memories' component={MemoriesScreen} />
            <Route path='/memories/:id'>
              {params => <FragmentDetail id={params.id} />}
            </Route>
            <Route path='/memories/:id/:photo'>
              {params => <FragmentDetail id={params.id} photo={params.photo} />}
            </Route>
            <Route path='/signals' component={SignalsScreen} />
            <Route path='/signals/:id'>
              {params => <SignalDetail id={params.id} />}
            </Route>
            <Route path='/constructs' component={ConstructsScreen} />
            <Route path='/constructs/:id'>
              {params => <ConstructDetail id={params.id} />}
            </Route>
            <Route path='/heroes' component={HeroesScreen} />
            <Route path='/heroes/:id'>
              {params => <HeroDetail id={params.id} />}
            </Route>
          </Switch>
        </Suspense>
      </RootLayout>
    </Route>
  </Switch>
);

export { App };
