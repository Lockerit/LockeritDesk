import { Typography, Container, Box } from '@mui/material';
import { useState, useEffect } from 'react';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { logger } from '@shared/utils/logger.js';

const fileName = 'Copyright';
const log = logger.scope(fileName);

export const Copyright = () => {
  const [version, setVersion] = useState('');
  const size = useWindowSizeContext();
  const scale = size.factor || 1;

  useEffect(() => {
    let mounted = true;
    log.info(`Montaje componente | scale=${scale}`);

    (async () => {
      try {
        if (!window?.electronAPI?.getAppVersion) {
          log.warn('IPC getAppVersion no disponible');
          return;
        }
        const v = await window.electronAPI.getAppVersion();
        if (mounted) {
          setVersion(v || '');
          log.info(`Versión obtenida: ${v || '(vacía)'}`);
        }
      } catch (e) {
        log.error(`Error obteniendo versión: ${e?.message || e}`);
      }
    })();

    return () => {
      mounted = false;
      log.debug('Desmontaje componente');
    };
  }, [scale]);

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: 'auto',
        textAlign: 'center',
        bgcolor: 'transparent',
        height: `${Math.max(50, Math.min(80, 60 * scale))}px`,
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="100%">
        <Typography variant="body1" color="text.primary">
          © {new Date().getFullYear()} Lockerit. Todos los derechos reservados - V{version}
        </Typography>
      </Container>
    </Box>
  );
};
