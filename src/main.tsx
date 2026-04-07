import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Polyfill fetch if it's missing, but avoid setting it if it's a getter-only property
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  // If fetch is missing or we want to ensure it's the native one, 
  // but we must be careful not to trigger "only a getter" error.
  try {
    // We don't actually want to overwrite it if it exists.
    // The error usually comes from a library doing window.fetch = ...
    // We can try to "lock" it or just provide a better error message.
    Object.defineProperty(window, 'fetch', {
      value: originalFetch || globalThis.fetch,
      writable: false,
      configurable: true
    });
  } catch (e) {
    console.warn('Could not lock window.fetch:', e);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
