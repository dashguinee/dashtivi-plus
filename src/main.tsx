import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { seedPaintedFromCache } from '@/lib/imageLoading';

// Register service worker + update detection
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((reg) => {
      setInterval(() => {
        reg.update();
      }, 5 * 60 * 1000);
    }).catch((err) => console.warn('[APP] SW registration failed:', err));
  });

  // When SW signals a new version, show update button (not auto-reload)
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data?.type === 'SW_UPDATED') {
      window.dispatchEvent(new CustomEvent('tivi-update-available'));
    }
  });
}

function mount() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Seed the painted-art registry from the SW's durable caches BEFORE first paint,
// so logos/posters already on-device render at full opacity on frame 1 after a
// reload — no re-fade. Capped so a slow Cache Storage can never delay boot: we
// race the seed against a short timeout and mount regardless (any art that
// wasn't seeded in time simply fades in once, then is remembered).
const _seedCapped = Promise.race([
  seedPaintedFromCache(),
  new Promise<void>((r) => setTimeout(r, 350)),
]);
_seedCapped.then(mount, mount);
