import {
    Close, ErrorOutline, CheckCircleOutline
} from '@mui/icons-material';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, Box, Slide, IconButton
} from '@mui/material';
import { useState, forwardRef, useEffect, useMemo, useCallback } from 'react';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { formatTime } from '@shared/utils/utils.js';
import { logger } from '@shared/utils/logger.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'ShowErrorAPI';
const log = logger.scope(fileName);

// Sanear/recortar para logs
function trimForLog(value, max = 240) {
    try {
        const s = typeof value === 'string'
            ? value
            : (value?.message ?? JSON.stringify(value));
        return String(s).replace(/\s+/g, ' ').trim().slice(0, max);
    } catch {
        return '(msg no serializable)';
    }
}

export const ShowErrorAPI = ({ open, onConfirm, msg, timeout = 15, isError = true }) => {
    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const msgPreview = useMemo(() => trimForLog(msg), [msg]);

    // Apertura/cambio de timeout
    useEffect(() => {
        if (!open) return;
        setSecondsLeft(timeout);
        log.info('modal abierto', { isError, timeout, msg: msgPreview });
    }, [open, timeout, isError, msgPreview]);

    // Tiqueo 1s
    useEffect(() => {
        if (!open || secondsLeft <= 0) return;
        const id = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
        return () => clearInterval(id);
    }, [open, secondsLeft]);

    // Autocierre por timeout
    useEffect(() => {
        if (!open || secondsLeft !== 0) return;
        log.warn('modal autocerrado por timeout', { timeout, msg: msgPreview });
        setSecondsLeft(timeout);
        onConfirm?.();
    }, [open, secondsLeft, onConfirm, timeout, msgPreview]);

    const handleConfirm = useCallback(() => {
        log.info('modal cerrado por usuario', { msg: msgPreview });
        onConfirm?.();
    }, [onConfirm, msgPreview]);

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
                    <Typography variant="body2">{formatTime(secondsLeft)}</Typography>
                    <IconButton onClick={handleConfirm}>
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

            <DialogActions sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                <Button
                    onClick={handleConfirm}
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
};
