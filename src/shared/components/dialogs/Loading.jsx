import { Backdrop, Box, CircularProgress, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const Loading = ({ open = true, message = 'Cargando...' }) => {
    const theme = useTheme();

    return (
        <Backdrop
            open={open}
            sx={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                color: '#fff',
                bgcolor: 'rgba(0,0,0,0.4)',
                zIndex: (t) => t.zIndex.modal + 1000,
            }}
        >
            <Box display="flex" flexDirection="column" alignItems="center">
                <CircularProgress
                    color="inherit"
                    size={theme.spacing(12)}
                    thickness={4}
                />
                <Typography
                    variant="h4"
                    sx={{ mt: theme.spacing(2), textAlign: 'center' }}
                >
                    {message}
                </Typography>
            </Box>
        </Backdrop>
    );
};
