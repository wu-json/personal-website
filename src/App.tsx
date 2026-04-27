import { lazy, Suspense } from 'react';
import { RootLayout } from 'src/layouts/RootLayout';
import { ConstructsScreen } from 'src/screens/Constructs';
import { ConstructDetail } from 'src/screens/Constructs/ConstructDetail';
import { HeroesScreen } from 'src/screens/Heroes';
import { HeroDetail } from 'src/screens/Heroes/HeroDetail';
import { HomeScreen } from 'src/screens/Home';
import { MemoriesScreen } from 'src/screens/Memories';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';
import { SignalsScreen } from 'src/screens/Signals';
import { SignalDetail } from 'src/screens/Signals/SignalDetail';
import { Route, Switch } from 'wouter';

// Gallery is the only intentionally-split route. Its 247 kB gz
// Three.js + R3F payload would be a clear LCP regression on `/`
// for the many visitors who never enter the gallery, so we keep it
// behind `lazy()` with a null fallback (the screen owns the whole
// viewport, so painting nothing during the fetch is fine).
const GalleryScreen = lazy(() =>
  import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
);

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
      </RootLayout>
    </Route>
  </Switch>
);

export { App };
