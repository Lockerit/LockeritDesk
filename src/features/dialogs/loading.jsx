// src/components/LoadingScreen.jsx
import React from 'react';
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';

const fileName = 'loading';

const LoadingScreen = ({ open = true, message = 'Cargando...' }) => {
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
                <CircularProgress color="inherit" size={100} />
                <Typography variant="h3" mt={2}>
                    {message}
                </Typography>
            </Box>
        </Backdrop>
    );
};

export default LoadingScreen;
