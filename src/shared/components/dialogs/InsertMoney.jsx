import { CurrencyExchange, Close } from '@mui/icons-material';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Button, Box, Slide, IconButton
} from '@mui/material';
import { useState, forwardRef, useEffect } from 'react';

import { Progressbar } from '@shared/components/bars/Progressbar.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { formatTime } from '@shared/utils/utils.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const InsertMoney = ({
    open,
    onCancel,
    amountService,
    amountPay,
    phone,
    timeout = 600,
}) => {
    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    // (Opcional) anunciar el monto cuando cambie
    useEffect(() => {
        const numericAmount = Number(String(amountPay || '').replace(/[^0-9.-]+/g, ''));
        if (!numericAmount) return;
    }, [amountPay]);

    // Reiniciar contador cuando se abre, cambia el timeout o cambia amountPay
    useEffect(() => {
        if (open) {
            setSecondsLeft(timeout);
        }
    }, [open, timeout, amountPay]);

    // Intervalo de cuenta regresiva (no depende de secondsLeft)
    useEffect(() => {
        if (!open) return;

        const id = setInterval(() => {
            setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => clearInterval(id);
    }, [open]);

    // Cerrar al llegar a 0
    useEffect(() => {
        if (open && secondsLeft === 0) {
            onCancel();
        }
    }, [open, secondsLeft, onCancel]);

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
                    <IconButton onClick={onCancel}>
                        <Close />
                    </IconButton>
                </Box>

                <DialogTitle>Realizando pago</DialogTitle>
            </Box>

            <DialogContent
                sx={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                }}
            >
                <Typography variant="h4" sx={{ textAlign: 'center', mt: 2 * scale, mb: 3 * scale }}>
                    Por favor deposite el dinero:
                </Typography>
                <Typography variant="h3" sx={{ textAlign: 'center', fontWeight: 'bold', mt: 2 * scale, mb: 3 * scale }}>
                    {phone}
                </Typography>

                <Box textAlign="center">
                    <Typography variant="h4" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                        Valor del servicio:{' '}
                    </Typography>
                    <Typography variant="h4" component="span" color="error" sx={{ fontWeight: 'bold' }}>
                        {amountService}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 * scale, m: 5 * scale }}>
                    <CurrencyExchange sx={{ fontSize: 150 * scale }} color="primary" />
                    <Progressbar msg="Valor ingresado:" amountPay={amountPay} />
                </Box>
            </DialogContent>

            <DialogActions
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', height: '100%', width: '100%' }}
            >
                <Button
                    onClick={onCancel}
                    color="secondary"
                    variant="contained"
                    fullWidth
                    sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}
                >
                    Cancelar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
