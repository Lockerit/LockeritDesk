import { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import { useWindowSize } from "../hooks/useWindowSize.js";

const fileName = 'copyright';

export default function Copyright() {

  const [version, setVersion] = useState('');
  const { width, height, factor } = useWindowSize();
  const scale = factor || 1; // de tu hook useElectronScreenData()
  const size = Math.max(30, 50 * scale); // mínimo 40px, escala hasta 80px o más

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
        height: `${Math.max(40, Math.min(80, 64 * scale))}px`, // entre 40px y 72px
        justifyContent: 'center', // centra el contenido verticalmente
      }}
    >
      <Container maxWidth="100%">
        <Typography variant="body1" color="text.primary">
          © {new Date().getFullYear()} Lockerit. Todos los derechos reservados - V{version}
        </Typography>
      </Container>
    </Box>
  );
}