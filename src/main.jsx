import { StrictMode, useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import App from './features/app/app.jsx';
import { createScaledTheme } from './features/utils/theme.js';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { UserProvider } from './features/context/userContext.jsx';
import { useWindowSizeContext, WindowSizeProvider } from './features/context/windowSizeContext.jsx';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import './fonts.css';
import LoadingScreen from './features/dialogs/loading.jsx';
import { ModalProvider } from './features/context/modalContext.jsx';

const fileName = 'main-renderer';

const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

function RootApp() {
  const [pendingCSP, setPendingCSP] = useState(null);

  // hook con valor inicial
  const size = useWindowSizeContext();

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

  log('debug', `RootApp size ${JSON.stringify(size)}`);

  if (!size?.factor || size.factor <= 0) {
    return <LoadingScreen open message="Cargando aplicación..." />;
  }

  const theme = useMemo(() => createScaledTheme(size.factor), [size.factor]);

  return (
    <>
      {pendingCSP && (
        <Stack
          sx={{
            position: 'fixed',
            top: '30%',
            transform: 'translateY(-50%)',
            width: '100%',
            zIndex: 9999,
            alignItems: 'center',
          }}
        >
          <Alert severity="warning">
            La configuración de seguridad cambió. Por favor cierra la aplicación y vuelve a abrirla.
          </Alert>
        </Stack>
      )}

      <UserProvider>
        <ModalProvider>
          <ThemeProvider key={`theme-${size.factor}`} theme={theme}>
            <CssBaseline />
            <App />
          </ThemeProvider>
        </ModalProvider>
      </UserProvider>
    </>
  );
}

async function bootstrap() {
  const initialSize = await window.electronAPI.getScreenDataOnce();

  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <WindowSizeProvider initialSize={initialSize}>
        <RootApp />
      </WindowSizeProvider>
    </StrictMode>
  );
}

bootstrap();
