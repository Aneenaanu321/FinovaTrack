import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ConfirmProvider } from './context/ConfirmContext';
import './index.css';
import { registerServiceWorker } from './utils/push';

if ('serviceWorker' in navigator) {
  registerServiceWorker().catch(() => {});
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ConfirmProvider>
          <App />
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </ConfirmProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
