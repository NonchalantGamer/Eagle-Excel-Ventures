import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';
import { ErrorBoundary } from './components/ErrorBoundary';

// Global error listener to prevent external browser extensions from logging uncaught exceptions
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    const msg = event?.message || '';
    if (msg.includes('redefine property: ethereum') || msg.includes('ethereum')) {
      event.preventDefault();
      event.stopImmediatePropagation?.();
      return true;
    }
  });
}

// Register Service Worker for offline B2B resilience
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);


