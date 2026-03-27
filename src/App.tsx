import { RootLayout } from 'src/layouts/RootLayout';
import { ConstructsScreen } from 'src/screens/Constructs';
import { ConstructDetail } from 'src/screens/Constructs/ConstructDetail';
import { GalleryScreen } from 'src/screens/Gallery';
import { HeroesScreen } from 'src/screens/Heroes';
import { HeroDetail } from 'src/screens/Heroes/HeroDetail';
import { HomeScreen } from 'src/screens/Home';
import { MemoriesScreen } from 'src/screens/Memories';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';
import { TransmissionsScreen } from 'src/screens/Transmissions';
import { TransmissionDetail } from 'src/screens/Transmissions/TransmissionDetail';
import { Route, Switch } from 'wouter';

const App = () => (
  <Switch>
    <Route path='/gallery/:fragmentId'>
      {params => <GalleryScreen fragmentId={params.fragmentId} />}
    </Route>
    {/* Dev-only: standalone gallery for testing layout without a fragment */}
    {import.meta.env.DEV && <Route path='/gallery' component={GalleryScreen} />}
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
          <Route path='/transmissions' component={TransmissionsScreen} />
          <Route path='/transmissions/:id'>
            {params => <TransmissionDetail id={params.id} />}
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
