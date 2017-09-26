import React from 'react';
import {render} from 'react-dom';
import App from './components/App.jsx';

document.addEventListener('DOMContentLoaded', () => {
  let root = document.getElementById('root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);
  }
  let defaultState = {
    loaded: false,
    languages: null,
    language: null,
    characterSet: null,
    characterPosition: null,
    characterOrder: null,
    disabledClassifications: null,
    shuffle: false,
    repeat: false,
    response: ''
  };
  render(<App {...defaultState} />, root);
});
