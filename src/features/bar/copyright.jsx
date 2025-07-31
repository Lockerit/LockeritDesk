import { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';

const fileName = 'copyright';

export default function Copyright() {

  const [version, setVersion] = useState('');

  useEffect(() => {
    const log = window?.electronAPI?.log;
    try {
      const versionResult = window.electronAPI?.getAppVersion?.();
      if (versionResult) {
        setVersion(versionResult);
        log?.('info', `[${fileName}] Versión cargada: ${versionResult}`);
      } else {
        log?.('warn', `[${fileName}] No se pudo obtener la versión de la aplicación`);
      }
    } catch (err) {
      log?.('error', `[${fileName}] Error al obtener la versión: ${err.message}`);
    }
  }, []);

  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        mt: 'auto',
        textAlign: 'center',
        bgcolor: 'transparent',
      }}
    >
      <Container maxWidth="lg">
        <Typography variant="body1" color="text.primary">
          © {new Date().getFullYear()} Lockerit. Todos los derechos reservados - V{version}
        </Typography>
      </Container>
    </Box>
  );
}