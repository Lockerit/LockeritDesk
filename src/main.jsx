import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './features/app/app.jsx';
import theme from './features/utils/theme.js';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { UserProvider } from './features/context/userContext.jsx';
import './fonts.css'; // Fuente Nunito local

// === Función log unificada ===
const fileName = 'main-renderer';

const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

// Función para aplicar la nueva CSP en caliente
function updateCSPMeta(csp) {
  const existing = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (existing) {
    existing.setAttribute('content', csp);
    log('info', `CSP actualizada: meta existente reemplazada con: ${csp}`);
  } else {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = csp;
    document.head.appendChild(meta);
    log('info', `CSP añadida dinámicamente: ${csp}`);
  }
}

// Listener global: se ejecuta una sola vez antes de renderizar React
if (window?.electronAPI?.onUpdateCSP) {
  window.electronAPI.onUpdateCSP((newCsp) => {
    updateCSPMeta(newCsp);
    log('debug', `Recibida nueva política CSP desde main: ${newCsp}`);
  });
  log('debug', 'Listener onUpdateCSP registrado correctamente');
} else {
  log('warn', 'onUpdateCSP no está disponible en electronAPI');
}

log('info', 'React App renderizando en <div id="root">');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <UserProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </UserProvider>
  </StrictMode>,
);
