import { RootLayout } from 'src/layouts/RootLayout';
import { ConstructsScreen } from 'src/screens/Constructs';
import { ConstructDetail } from 'src/screens/Constructs/ConstructDetail';
import { HeroesScreen } from 'src/screens/Heroes';
import { HeroDetail } from 'src/screens/Heroes/HeroDetail';
import { HomeScreen } from 'src/screens/Home';
import { MemoriesScreen } from 'src/screens/Memories';
import { FragmentDetail } from 'src/screens/Memories/FragmentDetail';
import { NotFoundScreen } from 'src/screens/NotFound';
import { SignalsScreen } from 'src/screens/Signals';
import { SignalDetail } from 'src/screens/Signals/SignalDetail';
import { Route, Switch } from 'wouter';

const SiteRoutes = () => (
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
      <Route component={NotFoundScreen} />
    </Switch>
  </RootLayout>
);

export { SiteRoutes };
