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
                    thickness={4}
                    sx={{
                        width: {
                            xs: theme.spacing(8),
                            sm: theme.spacing(10),
                            md: theme.spacing(12),
                        },
                        height: {
                            xs: theme.spacing(8),
                            sm: theme.spacing(10),
                            md: theme.spacing(12),
                        },
                    }}
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
