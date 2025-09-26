import { useState, forwardRef, useEffect } from 'react';
import { useWindowSizeContext } from '../context/windowSizeContext'; // Hook para tamaño pantalla
import { scaledDimension } from '../utils/scaledDimension.js';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Box,
    Slide,
    IconButton,
} from '@mui/material';
import {
    Close,
    ErrorOutline,
    CheckCircleOutline
} from '@mui/icons-material';
import { formatTime } from '../utils/utils.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'showErrorAPI';

export default function ShowErrorAPI({ open, onConfirm, msg, timeout = 15, isError = true }) {
    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    useEffect(() => {
        if (open) {
            setSecondsLeft(timeout);
        }
    }, [open, timeout]);

    // Manejar conteo regresivo
    useEffect(() => {
        if (!open || secondsLeft <= 0) return;

        const interval = setInterval(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [open, secondsLeft]);

    // Cerrar automáticamente al llegar a 0
    useEffect(() => {
        if (open && secondsLeft === 0) {
            setSecondsLeft(timeout);
            onConfirm();
        }
    }, [open, secondsLeft, onConfirm]);

    return (
        <Dialog
            open={open}
            onClose={() => { }}
            keepMounted={false}
            hideBackdrop               // 👈 evita bloquear clics en el fondo
            disableEscapeKeyDown
            disableEnforceFocus        // 👈 no fuerza el foco al modal
            disableAutoFocus
            disableRestoreFocus
            sx={{
                pointerEvents: "auto",   // 👈 asegura que botones sean clickeables
                zIndex: 1500,            // encima del keypad
            }}
            PaperProps={{
                sx: {
                    width: scaledDimension(
                        {
                            xs: { base: 70, min: 65, max: 75 },
                            sm: { base: 70, min: 65, max: 75 },
                            md: { base: 50, min: 45, max: 55 },
                            lg: { base: 40, min: 35, max: 45 },
                        },
                        scale
                    ),
                    height: 'auto',
                    borderRadius: `${Math.max(8, 16 * scale)}px`,
                    p: 2 * scale,
                },
            }}
            slots={{ transition: Transition }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 * scale, position: 'relative' }}>
                {/* Encabezado superior */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 1 * scale,
                        position: 'absolute',
                        right: 8 * scale,
                        top: 8 * scale,
                    }}
                >
                    <Typography variant="body2">
                        {formatTime(secondsLeft)}
                    </Typography>
                    <IconButton onClick={onConfirm}>
                        <Close />
                    </IconButton>
                </Box>

                <DialogTitle>Información</DialogTitle>
            </Box>

            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    gap: 2 * scale,
                }}
            >
                {isError ? (
                    <ErrorOutline color="error" sx={{ fontSize: 75 * scale }} />
                ) : (
                    <CheckCircleOutline color="success" sx={{ fontSize: 75 * scale }} />
                )}
                <Typography variant="h3" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                    {typeof msg === 'string' ? msg : msg?.message || JSON.stringify(msg)}
                </Typography>
            </DialogContent>

            <DialogActions
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    width: '100%',
                }}
            >
                <Button
                    onClick={onConfirm}
                    color="primary"
                    variant="contained"
                    fullWidth
                    sx={{ mx: 3 * scale, p: 3 * scale }}
                >
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
