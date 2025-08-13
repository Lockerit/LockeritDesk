import { useState, useEffect } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './features/app/app.jsx';
import theme from './features/utils/theme.js';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { UserProvider } from './features/context/userContext.jsx';
import './fonts.css';

const fileName = 'main-renderer';

const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

function RootApp() {
  const [pendingCSP, setPendingCSP] = useState(null);

  useEffect(() => {
    const currentMetaCSP =
      document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || null;

    const storedCSP = localStorage.getItem('lastAppliedCSP') || null;

    log('debug', `CSP actual en meta: ${currentMetaCSP}`);
    log('debug', `CSP en localStorage: ${storedCSP}`);

    if (window?.electronAPI?.onUpdateCSP) {
      window.electronAPI.onUpdateCSP((newCsp) => {
        const currentMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content');

        if (newCsp && newCsp !== currentMeta) {
          log('info', `CSP cambió, guardando en localStorage y mostrando banner`);
          localStorage.setItem('lastAppliedCSP', newCsp);
          setPendingCSP(newCsp);
        } else {
          log('debug', `CSP recibida es igual a la actual, no se hace nada`);
        }
      });
    }
  }, []);

  const handleReload = () => {
    const cspToApply = localStorage.getItem('lastAppliedCSP');
    if (cspToApply) {
      let meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('http-equiv', 'Content-Security-Policy');
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', cspToApply);
    }
    window.electronAPI.reloadApp();
  };

  return (
    <>
      {pendingCSP && (
        <Stack sx={{ position: 'fixed', top: '10%', width: '100%', zIndex: 9999 }}>
          <Alert
            severity="warning"
          // action={
          //   <Button color="inherit" size="small" onClick={handleReload}>
          //     Reiniciar
          //   </Button>
          // }
          >
            La configuración de seguridad cambió. Por favor cierre la aplicación y vuelva a abrirla.
          </Alert>
        </Stack>
      )}

      <UserProvider>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </UserProvider>
    </>
  );
}

log('info', 'React App renderizando en <div id="root">');
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootApp />
  </StrictMode>
);
