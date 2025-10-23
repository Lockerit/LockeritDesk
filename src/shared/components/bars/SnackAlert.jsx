// snackAlert.jsx
import { Snackbar, Alert } from '@mui/material';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext';

export const SnackAlert = ({ open, message, severity, onClose }) => {
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

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
                    fontSize: `${32 * scale}px`,
                    '& .MuiAlert-icon': {
                        fontSize: `${45 * scale}px` // ⬅️ Tamaño más grande del ícono
                    }
                }}
            >
                {message}
            </Alert>
        </Snackbar>
    );
};