// SnackAlert.jsx
import { Snackbar, Alert } from '@mui/material';
import { useTheme } from '@mui/material/styles';

export const SnackAlert = ({ open, message, severity, onClose }) => {
    const theme = useTheme();

    return (
        <Snackbar
            open={open}
            autoHideDuration={3000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
            <Alert
                elevation={6}
                variant="filled"
                severity={severity}
                onClose={onClose}
                sx={{
                    width: '100%',
                    fontSize: theme.typography.h6.fontSize,
                    '& .MuiAlert-icon': {
                        fontSize: theme.spacing(4.5), // tamaño icono
                        mr: theme.spacing(1.5),
                    },
                    '& .MuiAlert-message': {
                        display: 'flex',
                        alignItems: 'center',
                    },
                }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
};
