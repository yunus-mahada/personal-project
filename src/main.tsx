import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe PWA service worker registration in production without HMR conflicts
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
      console.warn('PWA service worker registration notice:', err);
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
