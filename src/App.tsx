import { BrowserRouter, Route, Routes } from 'react-router';
import { RootLayout } from 'src/layouts/RootLayout';
import { TransmissionsScreen } from 'src/screens/Transmissions';
import { ConstructsScreen } from 'src/screens/Constructs';
import { MemoriesScreen } from 'src/screens/Memories';
import { HomeScreen } from 'src/screens/Home';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<RootLayout />}>
        <Route path='/' element={<HomeScreen />} />
        <Route path='/memories' element={<MemoriesScreen />} />
        <Route path='/transmissions' element={<TransmissionsScreen />} />
        <Route path='/constructs' element={<ConstructsScreen />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export { App };
