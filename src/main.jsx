import React from 'react';
import ReactDOM from 'react-dom/client';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';
import App from './App.jsx';
import './index.css';

try {
  Keyboard.setResizeMode({ mode: KeyboardResize.None });
  Keyboard.setScroll({ isDisabled: true });
} catch (_) {}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);