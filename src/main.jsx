// src/main-renderer.jsx (Root y bootstrap con logging)
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider } from '@mui/material/styles';
import { useMemo } from 'react';
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

  // Contexto de tamaño
  const size = useWindowSizeContext();
  const factor = Number(size?.factor) > 0 ? Number(size.factor) : 1;

  // Tema escalado
  const theme = useMemo(() => {
    const t = createScaledTheme(factor);
    log.debug?.(`theme.scaled, { factor: ${factor} }`);
    return t;
  }, [factor]);


  if (!size?.factor || size.factor <= 0) {
    return <Loading open message="Cargando aplicación..." />;
  }

  return (
    <>
      <UserProvider>
        <ModalProvider>
          <KeyboardProvider>
            <ThemeProvider theme={theme}>
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
      <WindowSizeProvider initialSize={initialSize}>
        <RootApp />
      </WindowSizeProvider>
    );

    log.info('bootstrap.rendered');
  } catch (err) {
    log.error('bootstrap.error', { message: err?.message || String(err) });
  }
};

bootstrap();
