import { Close } from '@mui/icons-material';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Button, Box, Slide, Paper, IconButton
} from '@mui/material';
import { useState, forwardRef, useEffect, useMemo, useCallback } from 'react';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { formatTime } from '@shared/utils/utils.js';
import { logger } from '@shared/utils/logger.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'ShowLocker';
const log = logger.scope(fileName);

// Recorta mensajes para el log
const trimMsg = (v, max = 180) => {
    try {
        const s = typeof v === 'string' ? v : (v?.message ?? JSON.stringify(v));
        return String(s).replace(/\s+/g, ' ').trim().slice(0, max);
    } catch { return '(msg no serializable)'; }
};

export const ShowLocker = ({
    open,
    onConfirm,
    locker,
    title,
    msg,
    timeout = 15,
    backColor = 'gray',
    operation
}) => {
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const msgPreview = useMemo(() => trimMsg(msg), [msg]);

    // Abre / cambia timeout
    useEffect(() => {
        if (!open) return;
        setSecondsLeft(timeout);
        log.info('modal abierto', { operation, locker, timeout, msg: msgPreview });
    }, [open, timeout, operation, locker, msgPreview]);

    // Tiqueo 1s
    useEffect(() => {
        if (!open || secondsLeft <= 0) return;
        const id = setInterval(() => setSecondsLeft(p => p - 1), 1000);
        return () => clearInterval(id);
    }, [open, secondsLeft]);

    // Autocierre por timeout
    useEffect(() => {
        if (!open || secondsLeft !== 0) return;
        log.warn('modal autocerrado por timeout', { operation, locker, timeout });
        setSecondsLeft(timeout);
        onConfirm?.();
    }, [open, secondsLeft, onConfirm, timeout, operation, locker]);

    const handleConfirm = useCallback(() => {
        log.info('modal cerrado por usuario', { operation, locker });
        onConfirm?.();
    }, [onConfirm, operation, locker]);

    return (
        <Dialog
            open={open}
            onClose={() => { }}
            keepMounted={false}
            hideBackdrop
            disableEscapeKeyDown
            disableEnforceFocus
            disableAutoFocus
            disableRestoreFocus
            sx={{ pointerEvents: 'auto', zIndex: 1500 }}
            PaperProps={{
                sx: {
                    width: scaledDimension(
                        {
                            xs: { base: 60, min: 55, max: 65 }, sm: { base: 60, min: 55, max: 65 },
                            md: { base: 50, min: 45, max: 55 }, lg: { base: 40, min: 35, max: 45 }
                        }, scale),
                    height: scaledDimension(
                        {
                            xs: { base: 60, min: 55, max: 65 }, sm: { base: 60, min: 55, max: 65 },
                            md: { base: 80, min: 75, max: 85 }, lg: { base: 80, min: 75, max: 85 }
                        }, scale),
                    overflow: 'hidden',
                    borderRadius: `${Math.max(8, 16 * scale)}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    p: 3 * scale,
                },
            }}
            slots={{ transition: Transition }}
        >
            {/* Encabezado */}
            <Box
                sx={{
                    display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
                    gap: 1 * scale, position: 'absolute', right: 3 * scale, top: 3 * scale,
                }}
            >
                <Typography variant="body2">{formatTime(secondsLeft)}</Typography>
                <IconButton onClick={handleConfirm}><Close /></IconButton>
            </Box>

            <DialogTitle sx={{ textAlign: 'center' }}>Apertura de casillero</DialogTitle>

            {/* Contenido */}
            <DialogContent
                sx={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden', p: 0,
                }}
            >
                <Typography variant="h3" sx={{ textAlign: 'center', mt: 2 * scale, fontWeight: 'bold' }}>
                    {title}
                </Typography>

                <Paper
                    elevation={24}
                    sx={{
                        width: '40%', height: '40%', display: 'flex',
                        justifyContent: 'center', alignItems: 'center',
                        backgroundColor: backColor || 'primary.main',
                        color: 'error.contrastText',
                    }}
                >
                    <Typography variant="h1" sx={{ textAlign: 'center', fontWeight: 'bold' }}>
                        {locker}
                    </Typography>
                </Paper>

                <Typography variant="h4" sx={{ textAlign: 'center', py: 2 * scale }}>
                    {msg}
                </Typography>

                {(operation === 'Retirar' || operation === 'Guardar' || operation === 'Reservado') && (
                    <Typography variant="h4" sx={{ textAlign: 'center', fontWeight: 'bold', py: 2 * scale }}>
                        ¡No olvides cerrar el casillero!
                    </Typography>
                )}
                {operation === 'Retirar' && (
                    <Typography variant="h5" sx={{ textAlign: 'center' }}>
                        Disponible para una nueva asignación.
                    </Typography>
                )}
            </DialogContent>

            {/* Acciones */}
            <DialogActions sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                <Button onClick={handleConfirm} color="primary" variant="contained" fullWidth sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}>
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
