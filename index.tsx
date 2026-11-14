import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/App';
import './index.css';

// Prevent iOS Safari pinch-zoom gestures during puzzle dragging
document.addEventListener(
  'gesturestart',
  (e) => {
    e.preventDefault();
  },
  { passive: false },
);

const rootEl = document.getElementById('root');
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
