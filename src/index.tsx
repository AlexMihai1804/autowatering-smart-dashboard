import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

if (import.meta.env.DEV) {
  // Mirror WebView/browser console.* into the terminal via Vite middleware.
  // (Works on Android too; avoids logcat restrictions.)
  import('./utils/consoleForwarder').then(({ installConsoleForwarder }) => {
    installConsoleForwarder();
    console.log('[DEV] console forwarder installed');
  });
}

if (import.meta.env.DEV) {
  console.log('[DEV] App started');
}

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
