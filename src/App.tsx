import { BrowserRouter, Route, Routes } from 'react-router';
import { HomeScreen } from 'src/screens/Home';

const App = () => (
  <BrowserRouter>
    <Routes>
      <Route path='/' element={<HomeScreen />} />
    </Routes>
  </BrowserRouter>
);

export { App };
