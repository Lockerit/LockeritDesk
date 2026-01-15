import { Typography, Container, Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect } from 'react';

import { logger } from '@shared/utils/logger.js';

const fileName = 'Copyright';
const log = logger.scope(fileName);

export const Copyright = () => {
  const [version, setVersion] = useState('');
  const theme = useTheme();

  useEffect(() => {
    let mounted = true;
    log.info('Montaje componente');

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
  }, []);

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: 'auto',
        textAlign: 'center',
        bgcolor: 'transparent',
        height: { xs: theme.spacing(6), sm: theme.spacing(8) },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Container maxWidth="100%">
        <Typography variant="body2" color="text.primary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          © {new Date().getFullYear()} Lockerit. Todos los derechos reservados - V{version}
        </Typography>
      </Container>
    </Box>
  );
};
