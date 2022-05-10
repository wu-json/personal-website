import ReactDOM from 'react-dom';

import { App } from './App';

describe('App Tests', () => {
  it('renders without crashing', () => {
    const div = document.createElement('div');
    ReactDOM.render(<App />, div);
  });
});
