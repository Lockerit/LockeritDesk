// snackAlert.jsx
import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const fileName = 'snackAlert';

export default function SnackBarAlert({ open, message, severity, onClose }) {
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
                    fontSize: '32px',
                    '& .MuiAlert-icon': {
                        fontSize: 45 // ⬅️ Tamaño más grande del ícono
                    }
                }}
            >
                {message}
            </MuiAlert>
        </Snackbar>
    );
};