import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initStore } from './store/store';
import { requestPersistence } from './lib/storage';
import './styles/global.css';

// Service worker: la app funciona sin conexión y se actualiza sola al abrirla
registerSW({ immediate: true });

// ── Bloqueo de zoom ──
// iOS ignora `user-scalable=no` en algunos casos, así que se cortan también
// los gestos de pellizco (eventos propietarios de Safari).
const stop = (e: Event) => e.preventDefault();
document.addEventListener('gesturestart', stop, { passive: false });
document.addEventListener('gesturechange', stop, { passive: false });
document.addEventListener('gestureend', stop, { passive: false });
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches.length > 1) e.preventDefault();
  },
  { passive: false }
);
// El zoom por doble toque lo desactiva `touch-action: manipulation` (global.css)
// sin cancelar toques rápidos legítimos (p. ej. pulsar varias veces “−”).

void initStore().then(() => requestPersistence());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
