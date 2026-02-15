import { BrowserRouter, Route, Routes } from 'react-router';
import { RootLayout } from 'src/layouts/RootLayout';
import { GalleryScreen } from 'src/screens/Gallery';
import { HomeScreen } from 'src/screens/Home';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route element={<RootLayout />}>
        <Route path='/' element={<HomeScreen />} />
        <Route path='/gallery' element={<GalleryScreen />} />
      </Route>
    </Routes>
  </BrowserRouter>
);

export { App };
