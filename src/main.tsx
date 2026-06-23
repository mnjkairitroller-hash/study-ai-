import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent sandbox/preview crash on benign third-party/youtube cross-origin "Script error."
window.addEventListener('error', (event) => {
  if (
    event.message === 'Script error.' || 
    event.message?.includes('youtube') || 
    event.message?.includes('YT') ||
    !event.filename
  ) {
    console.warn('Ignored benign cross-origin error:', event.message);
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason?.message || '';
  if (reason.includes('youtube') || reason.includes('YT') || reason === 'Script error.') {
    console.warn('Ignored benign unhandled rejection:', reason);
    event.stopImmediatePropagation();
    event.preventDefault();
  }
});

createRoot(document.getElementById('root')!).render(
  <App />
);

