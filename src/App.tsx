import { lazy, StrictMode, Suspense } from 'react';
import { ExhibitionScreen } from 'src/screens/Exhibition';
import { Route, Switch } from 'wouter';

const GalleryScreen = lazy(() =>
  import('src/screens/Gallery').then(m => ({ default: m.GalleryScreen })),
);

const SiteRoutes = lazy(() =>
  import('src/SiteRoutes').then(m => ({ default: m.SiteRoutes })),
);

const App = () => (
  <Switch>
    <Route path='/gallery/:fragmentId'>
      {params => (
        <StrictMode>
          <Suspense fallback={null}>
            <GalleryScreen fragmentId={params.fragmentId} />
          </Suspense>
        </StrictMode>
      )}
    </Route>
    <Route path='/exhibition/:id?/:sub?'>
      {params => <ExhibitionScreen id={params.id} sub={params.sub} />}
    </Route>
    {import.meta.env.DEV && (
      <Route path='/gallery'>
        <StrictMode>
          <Suspense fallback={null}>
            <GalleryScreen />
          </Suspense>
        </StrictMode>
      </Route>
    )}
    <Route>
      <StrictMode>
        <Suspense fallback={null}>
          <SiteRoutes />
        </Suspense>
      </StrictMode>
    </Route>
  </Switch>
);

export { App };
