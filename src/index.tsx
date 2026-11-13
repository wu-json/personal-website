import { Analytics } from '@vercel/analytics/react';
import ReactDOM from 'react-dom/client';

import { App } from './App';

import './index.css';
import { ThemeProvider } from './theme/ThemeContext';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement,
);

root.render(
  <ThemeProvider>
    <App />
    <Analytics scriptSrc='/vitals/script.js' endpoint='/vitals' />
  </ThemeProvider>,
);
