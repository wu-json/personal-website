import { RootLayout } from 'src/layouts/RootLayout';
import { ConstructsScreen } from 'src/screens/Constructs';
import { GardenScreen } from 'src/screens/Garden';
import { HeroesScreen } from 'src/screens/Heroes';
import { HomeScreen } from 'src/screens/Home';
import { MemoriesScreen } from 'src/screens/Memories';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';
import { TransmissionsScreen } from 'src/screens/Transmissions';
import { TransmissionDetail } from 'src/screens/Transmissions/TransmissionDetail';
import { Route, Switch } from 'wouter';

const App = () => (
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
      <Route path='/heroes' component={HeroesScreen} />
      <Route path='/garden' component={GardenScreen} />
    </Switch>
  </RootLayout>
);

export { App };
