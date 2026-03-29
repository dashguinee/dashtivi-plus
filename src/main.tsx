import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';

// Register service worker + update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      console.log('[APP] SW registered, scope:', reg.scope);
      setInterval(() => {
        console.log('[APP] Checking for SW update...');
        reg.update();
      }, 5 * 60 * 1000);
    }).catch((err) => console.warn('[APP] SW registration failed:', err));
  });

  // When SW signals a new version, show update button (not auto-reload)
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'SW_UPDATED') {
      console.log('[APP] New version available — showing update button');
      window.dispatchEvent(new CustomEvent('tivi-update-available'));
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
