import { lazy, Suspense } from 'react';
import { RootLayout } from 'src/layouts/RootLayout';
import { screens } from 'src/lib/prefetchRoute';
import { HomeScreen } from 'src/screens/Home';
import { Route, Switch } from 'wouter';

// Gallery is its own entry (bypasses RootLayout, not prefetched — 887 kB
// Three.js chunk is too heavy to warm speculatively). Plain `lazy()`
// is fine here: nothing preloads it, so the Suspense fallback is the
// expected UX on first navigation.
const GalleryScreen = lazy(() =>
  import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
);

// All other lazy screens come from `screens`, where each entry owns
// both the lazy `Component` *and* a `preload()` that primes its
// payload synchronously after the network resolves — so by the time a
// click reaches `<Switch>`, the matching component renders without
// suspending. See `src/lib/prefetchRoute.ts` for why naive
// `React.lazy` + module-cache prefetch isn't enough on its own.
const MemoriesScreen = screens.memories.Component;
const FragmentDetail = screens.memoriesDetail.Component;
const SignalsScreen = screens.signals.Component;
const SignalDetail = screens.signalsDetail.Component;
const ConstructsScreen = screens.constructs.Component;
const ConstructDetail = screens.constructsDetail.Component;
const HeroesScreen = screens.heroes.Component;
const HeroDetail = screens.heroesDetail.Component;

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
