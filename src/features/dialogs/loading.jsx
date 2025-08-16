// src/components/LoadingScreen.jsx
import React from 'react';
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla

const fileName = 'loading';

const LoadingScreen = ({ open = true, message = 'Cargando...' }) => {
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1;

    return (
        <Backdrop
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                color: '#fff',
                zIndex: (theme) => theme.zIndex.modal + 1000,
            }}
            open={open}
        >
            <Box display="flex" flexDirection="column" alignItems="center">
                <CircularProgress color="inherit" size={100 * scale} />
                <Typography variant="h3" mt={2 * scale}>
                    {message}
                </Typography>
            </Box>
        </Backdrop>
    );
};

export default LoadingScreen;
