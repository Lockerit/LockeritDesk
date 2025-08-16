// snackAlert.jsx
import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla

const fileName = 'snackAlert';

export default function SnackBarAlert({ open, message, severity, onClose }) {
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1;

    return (
        <Snackbar
            open={open}
            autoHideDuration={3000}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
            <MuiAlert
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
            </MuiAlert>
        </Snackbar>
    );
};