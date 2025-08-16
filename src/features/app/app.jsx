import { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { HashRouter } from 'react-router-dom';
import DenseAppBar from '../bar/appbar.jsx';
import Copyright from '../bar/copyright.jsx';
import AppRoutes from '../router/router.jsx';
import { useUser } from '../context/userContext.jsx';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla

const USER_STORAGE_KEY = 'userInit';
const fileName = 'app';

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export default function App() {
    const { userInit, setUserInit } = useUser();
    const [version, setVersion] = useState('');
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1; // de tu hook useElectronScreenData()

    useEffect(() => {
        if (!userInit) return;

        localStorage.setItem('isCancelInsertMoney', false);

        const lsUserInit = localStorage.getItem(USER_STORAGE_KEY);
        if (!lsUserInit)
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInit));

        log('info', 'Componente App montado');

        try {
            const versionResult = window.electronAPI?.getAppVersion?.();
            if (versionResult) {
                setVersion(versionResult);
                log('info', `Versión cargada: ${versionResult}`);
            } else {
                log('warn', 'No se pudo obtener la versión de la aplicación');
            }
        } catch (err) {
            log('error', `Error al obtener la versión: ${err.message}`);
        }
    }, []);

    return (
        <HashRouter>
            <Container
                maxWidth={false}
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    px: width < 1280 ? 2 : 4, // Márgenes dinámicos
                    fontSize: width < 768 ? '0.9rem' : '1rem' // Fuente adaptable
                }}
            >
                {/* AppBar */}
                <Box sx={{
                    flexGrow: 1,
                    my: 2 * scale,
                    mt: `${Math.max(40, Math.min(80, 30 * scale))}px` // misma altura dinámica que el AppBar
                }}>
                    <DenseAppBar />
                </Box>

                {/* Contenido principal */}
                <Box sx={{ flexGrow: 1, my: 2 * scale }}>
                    <AppRoutes />
                </Box>

                {/* Footer */}
                <Box sx={{ my: 2 * scale }}>
                    <Copyright />
                </Box>
            </Container>
        </HashRouter>
    );
}
