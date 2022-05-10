import ReactDOM from 'react-dom/client';

import { App } from '../App';

describe('App Tests', () => {
  it('renders without crashing', () => {
    const root = ReactDOM.createRoot(document.createElement('div'));
    root.render(<App />);
  });
});
