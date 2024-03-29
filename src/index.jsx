if (process.env.NODE_ENV === 'development') {
  require('preact/devtools');
}

import { h, render } from 'preact';
import App from './components/App.jsx';

const root = document.getElementById('root');
render(<App />, root);
