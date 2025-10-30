// src/main-renderer.jsx (Root y bootstrap con logging)
import { Alert, Stack } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { StrictMode, useMemo, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

import './fonts.css';

import { App } from '@app/App.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { KeyboardProvider } from '@shared/context/KeyboardProvider.jsx';
import { ModalProvider } from '@shared/context/ModalProvider.jsx';
import { UserProvider } from '@shared/context/UserProvider.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { WindowSizeProvider } from '@shared/context/WindowSizeProvider.jsx';
import { createScaledTheme } from '@shared/theme/theme.js';
import { logger } from '@shared/utils/logger.js';

const fileName = 'main-renderer';
const log = logger.scope(fileName);

export const RootApp = () => {
  const [pendingCSP, setPendingCSP] = useState(null);

  // Contexto de tamaño
  const size = useWindowSizeContext();
  const factor = Number(size?.factor) > 0 ? Number(size.factor) : 1;

  // Tema escalado
  const theme = useMemo(() => {
    const t = createScaledTheme(factor);
    log.debug?.('theme.scaled', { factor });
    return t;
  }, [factor]);

  // Listener de CSP una sola vez
  useEffect(() => {
    const currentMetaCSP =
      document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content') || null;
    const storedCSP = localStorage.getItem('lastAppliedCSP') || null;
    log.info('csp.init', { currentMetaCSP, storedCSP });

    if (window?.electronAPI?.onUpdateCSP) {
      const handler = (newCsp) => {
        const currentMeta =
          document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.getAttribute('content');
        if (newCsp && newCsp !== currentMeta) {
          localStorage.setItem('lastAppliedCSP', newCsp);
          setPendingCSP(newCsp);
          log.info('csp.changed', { from: currentMeta, to: newCsp });
        } else {
          log.debug?.('csp.nochange');
        }
      };

      window.electronAPI.onUpdateCSP(handler);
      log.info('csp.listener.attached');
      // Si tienes offUpdateCSP disponible:
      // return () => window.electronAPI.offUpdateCSP?.(handler);
    } else {
      log.warn('csp.listener.unavailable');
    }
  }, []);

  if (!size?.factor || size.factor <= 0) {
    return <Loading open message="Cargando aplicación..." />;
  }

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
          <KeyboardProvider>
            <ThemeProvider key={`theme-${factor}`} theme={theme}>
              <CssBaseline />
              <App />
            </ThemeProvider>
          </KeyboardProvider>
        </ModalProvider>
      </UserProvider>
    </>
  );
};

const bootstrap = async () => {
  try {
    log.info('bootstrap.start');
    const initialSize = await window.electronAPI.getScreenDataOnce();
    log.info('bootstrap.screenData', { initialSize });

    const rootEl = document.getElementById('root');
    if (!rootEl) {
      log.error('bootstrap.noRootElement');
      return;
    }

    createRoot(rootEl).render(
      <StrictMode>
        <WindowSizeProvider initialSize={initialSize}>
          <RootApp />
        </WindowSizeProvider>
      </StrictMode>
    );

    log.info('bootstrap.rendered');
  } catch (err) {
    log.error('bootstrap.error', { message: err?.message || String(err) });
  }
};

bootstrap();
