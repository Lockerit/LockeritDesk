import { useState, forwardRef, useEffect } from 'react';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
import { scaledWidth } from '../utils/scaledWidth';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Box,
    Slide,
    IconButton
} from '@mui/material';
import {
    SmsFailed,
    Close,
    ErrorOutline
} from '@mui/icons-material';
import {
    formatTime
} from '../utils/utils.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'showErrorAPI';

export default function ShowErrorAPI({ open, onConfirm, msg, timeout = 15 }) {

    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1;

    useEffect(() => {
        if (open) {
            setSecondsLeft(timeout); // reinicia cada vez que abre
        }
    }, [open, timeout]);

    // Manejar conteo
    useEffect(() => {
        if (!open || secondsLeft <= 0) return;

        const interval = setInterval(() => {
            setSecondsLeft(prev => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [open, secondsLeft]);

    // Cerrar automáticamente cuando llegue a 0
    useEffect(() => {
        if (open && secondsLeft === 0) {
            setSecondsLeft(timeout);
            setTimeout(() => {
                onConfirm();
            }, 0);
        }
    }, [open, secondsLeft, onConfirm]);

    return (
        <Dialog open={open} onClose={(event, reason) => {
            if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                setTimeout(() => onConfirm(), 0); // diferir para evitar el warning
            }

        }}
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    width: scaledWidth(
                        {
                            xs: { base: 70, min: 65, max: 75 }, // en % para mobile
                            sm: { base: 60, min: 55, max: 65 }, // tablet
                            md: { base: 50, min: 45, max: 55 }, // desktop medio
                            lg: { base: 40, min: 35, max: 45 }, // desktop grande
                        },
                        scale
                    ),
                    height: 'auto',
                    // maxWidth: `${Math.max(70, Math.min(95, 90 * scale))}vw`, // rango de 70%-95% según escala
                    borderRadius: `${Math.max(8, 16 * scale)}px`, // esquinas suaves que escalan
                    p: 2 * scale // padding proporcional
                }
            }}
            slots={{
                transition: Transition,
            }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
                {/* Encabezado superior: tiempo y botón cerrar */}
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 1,
                        position: 'absolute',
                        right: 8,
                        top: 8,
                    }}
                >
                    <Typography variant="body2">
                        {formatTime(secondsLeft)}
                    </Typography>
                    <IconButton onClick={onConfirm}>
                        <Close />
                    </IconButton>
                </Box>

                {/* Texto centrado */}
                <DialogTitle>
                    Información
                </DialogTitle>
            </Box>

            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',   // centra horizontalmente
                    justifyContent: 'center', // centra verticalmente
                    textAlign: 'center',
                }}
            >
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                    <ErrorOutline color="error" sx={{ fontSize: 75 * scale }} />
                </Box>
                <Box textAlign="center">
                    <Typography variant="h3" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                        {typeof msg === 'string' ? msg : msg?.message || JSON.stringify(msg)}
                    </Typography>
                </Box>
            </DialogContent>

            <DialogActions
                sx={{
                    display: 'flex',
                    alignItems: 'center',   // centra horizontalmente
                    justifyContent: 'center', // centra verticalmente
                    textAlign: 'center',
                    height: '100%', // puedes ajustar esto según lo que necesites
                    width: '100%',
                }}>
                <Button onClick={onConfirm} color="primary" variant="contained" fullWidth sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}>
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
