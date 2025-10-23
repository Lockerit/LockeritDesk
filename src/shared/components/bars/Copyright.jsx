import { Typography, Container, Box } from '@mui/material';
import { useState, useEffect } from 'react';


import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';

export const Copyright = () => {

  const [version, setVersion] = useState('');
  const size = useWindowSizeContext();
  const scale = size.factor || 1; // de tu hook useElectronScreenData()

  useEffect(() => {
    const _versionResult = window.electronAPI?.getAppVersion?.();
    if (_versionResult) {
      setVersion(_versionResult);
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
        height: `${Math.max(50, Math.min(80, 60 * scale))}px`, // entre 40px y 72px
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