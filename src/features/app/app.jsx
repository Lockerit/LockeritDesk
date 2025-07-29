import { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { HashRouter } from 'react-router-dom';
import DenseAppBar from '../bar/appbar.jsx';
import Copyright from '../bar/copyright.jsx';
import AppRoutes from '../router/router.jsx';
import { useUser } from '../context/userContext.jsx';

const USER_STORAGE_KEY = 'userInit';

export default function App() {
    const fileName = 'app';
    const [version, setVersion] = useState('');
    const { userInit, setUserInit } = useUser();

    useEffect(() => {

        if (!userInit) return;

        const lsUserInit = localStorage.getItem(USER_STORAGE_KEY);
            
        if (!lsUserInit)
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInit))

        const log = window?.electronAPI?.log;

        if (log) {
            log('info', `[${fileName}] Componente App montado`);
        }

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
        <HashRouter>
            <Container maxWidth={false} sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                {/* AppBar */}
                <Box sx={{ mb: 2 }}>
                    <DenseAppBar />
                </Box>

                {/* Contenido principal */}
                <Box sx={{ flexGrow: 1, py: 2 }}>
                    <AppRoutes />
                </Box>

                {/* Footer */}
                <Box sx={{ py: 2 }}>
                    <Copyright />
                </Box>
            </Container>
        </HashRouter>
    );
}
