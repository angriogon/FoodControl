import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { initStore } from './store/store';
import { requestPersistence } from './lib/storage';
import './styles/global.css';

// Service worker: la app funciona sin conexión y se actualiza sola al abrirla
registerSW({ immediate: true });

void initStore().then(() => requestPersistence());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
