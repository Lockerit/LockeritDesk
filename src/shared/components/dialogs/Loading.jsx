// src/components/LoadingScreen.jsx
import { Box, CircularProgress, Typography, Backdrop } from '@mui/material';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';

export const Loading = ({ open = true, message = 'Cargando...' }) => {
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

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
