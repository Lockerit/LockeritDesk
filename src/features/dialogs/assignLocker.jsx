import { useState, forwardRef, useEffect } from 'react';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
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
        <Dialog
            open={open}
            onClose={(event, reason) => {
                if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                    setTimeout(() => onConfirm(), 0);
                }
            }}
            disableEscapeKeyDown
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
                    height: scaledDimension(
                        {
                            xs: { base: 40, min: 35, max: 45 },
                            sm: { base: 40, min: 35, max: 45 },
                            md: { base: 80, min: 75, max: 85 },
                            lg: { base: 80, min: 75, max: 85 },
                        },
                        scale
                    ),
                    maxHeight: '90vh',
                    overflow: "hidden",   // ✅ scroll si se pasa
                    borderRadius: `${Math.max(8, 16 * scale)}px`,
                    display: "flex",
                    flexDirection: "column",
                    p: 3 * scale,
                },
            }}
            slots={{ transition: Transition }}
        >
            {/* Encabezado */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 1 * scale,
                    position: "absolute",
                    right: 3 * scale,
                    top: 3 * scale,
                }}
            >
                <Typography variant="body2">
                    {formatTime(secondsLeft)}
                </Typography>
                <IconButton onClick={onConfirm}>
                    <Close />
                </IconButton>
            </Box>

            <DialogTitle sx={{ textAlign: "center" }}>
                Apertura de casillero
            </DialogTitle>

            {/* Contenido */}
            <DialogContent
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center",
                    alignContent: "center",
                    overflow: "hidden",
                    p: 0,
                }}
            >
                <Typography variant="h3" sx={{ textAlign: "center", mt: 2 * scale, fontWeight: "bold" }}>
                    Tu casillero es el:
                </Typography>

                <Paper
                    elevation={24}
                    sx={{
                        flex: "0 0 40%",
                        justifyContent: "center",
                        alignContent: "center",
                        alignItems: "center",
                        width: "40%",
                        backgroundColor: backColor || "primary.main",
                        color: "error.contrastText",
                    }}
                >
                    <Typography variant="h1" sx={{ textAlign: "center", fontWeight: "bold" }}>
                        {locker}
                    </Typography>
                </Paper>

                <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold" }}>
                    {msg}
                </Typography>

                <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold" }}>
                    ¡No olvides cerrar el casillero!
                </Typography>

                {msg.substring(0, 6) === "Retira" && (
                    <Typography variant="h5" sx={{ textAlign: "center", fontWeight: "bold" }}>
                        Disponible para una nueva asignación.
                    </Typography>
                )}
            </DialogContent>

            {/* Acciones */}
            <DialogActions
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                }}
            >
                <Button
                    onClick={onConfirm}
                    color="primary"
                    variant="contained"
                    fullWidth
                    sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}
                >
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>

    );
}
