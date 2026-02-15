import { RootLayout } from 'src/layouts/RootLayout';
import { ConstructsScreen } from 'src/screens/Constructs';
import { GardenScreen } from 'src/screens/Garden';
import { HomeScreen } from 'src/screens/Home';
import { MemoriesScreen } from 'src/screens/Memories';
import { TransmissionsScreen } from 'src/screens/Transmissions';
import { Route, Switch } from 'wouter';

const App = () => (
  <RootLayout>
    <Switch>
      <Route path='/' component={HomeScreen} />
      <Route path='/memories' component={MemoriesScreen} />
      <Route path='/transmissions' component={TransmissionsScreen} />
      <Route path='/constructs' component={ConstructsScreen} />
      <Route path='/garden' component={GardenScreen} />
    </Switch>
  </RootLayout>
);

export { App };
