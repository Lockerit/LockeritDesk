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
    Paper,
    IconButton
} from '@mui/material';
import {
    Close
} from '@mui/icons-material';
import {
    formatTime
} from '../utils/utils.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'assignLocker';

export default function AssignLocker({ open, onConfirm, locker, msg, timeout = 15, backColor }) {

    const { width, height, factor } = useWindowSize();
    const scale = factor || 1;

    const [secondsLeft, setSecondsLeft] = useState(timeout);

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
            setTimeout(() => onConfirm(), 100);
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
                    Apertura de casillero
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
                <Typography variant="h3" sx={{ textAlign: 'center', mt: 2 * scale, mb: 3 * scale, fontWeight: 'bold' }}>
                    Tu casillero es el:
                </Typography>
                <Box textAlign="center" sx={{ mb: 3 * scale }}>
                    <Paper elevation={24}
                        sx={{
                            p: 5 * scale,
                            height: '30%',
                            with: '30%',
                            mx: 'auto',
                            my: 5 * scale,
                            backgroundColor: backColor || 'primary.main',
                            color: 'error.contrastText',
                            // border: '5px solid', // (azul)
                            // color: 'error.main',
                            // borderRadius: '50%',
                        }}>
                        <Typography variant="h1" sx={{ textAlign: 'center', m: 2 * scale, fontWeight: 'bold' }}>
                            {locker}
                        </Typography>
                    </Paper>
                </Box>
                <Typography variant="h4" sx={{ textAlign: 'center', my: 5 * scale }}>
                    {msg}
                </Typography>
                <Typography variant="h4" sx={{ textAlign: 'center', my: 2 * scale, fontWeight: 'bold' }}>
                    ¡No olvides cerrar el casillero!
                </Typography>
                {msg.substring(0, 6) === 'Retira' && (
                    <Typography variant="h5" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                        Disponible para una nueva asignación.
                    </Typography>
                )}
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
