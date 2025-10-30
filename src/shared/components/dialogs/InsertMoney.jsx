import { CurrencyExchange, Close } from '@mui/icons-material';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Typography, Button, Box, Slide, IconButton
} from '@mui/material';
import { useState, forwardRef, useEffect, useMemo, useRef } from 'react';

import { Progressbar } from '@shared/components/bars/Progressbar.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { formatTime } from '@shared/utils/utils.js';
import { logger } from '@shared/utils/logger.js';

const fileName = 'InsertMoney';
const log = logger.scope(fileName);

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

    // snapshot para evitar logs repetidos
    const lastLogged = useRef({ open: undefined, amountPay: undefined, timeout: undefined });

    // Normaliza monto pagado a número
    const numericAmountPay = useMemo(() => {
        const n = Number(String(amountPay ?? '').replace(/[^0-9.-]+/g, ''));
        return Number.isFinite(n) ? n : 0;
    }, [amountPay]);

    useEffect(() => {
        log.info(`Montaje | timeout=${timeout} | phone=${phone ?? ''}`);
        return () => {
            log.debug('Desmontaje');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Log de cambios relevantes de props
    useEffect(() => {
        if (lastLogged.current.open !== open) {
            log.debug(`Prop changed: open=${open}`);
            lastLogged.current.open = open;
        }
        if (lastLogged.current.timeout !== timeout) {
            log.info(`Prop changed: timeout=${timeout}`);
            lastLogged.current.timeout = timeout;
        }
        if (lastLogged.current.amountPay !== amountPay) {
            log.debug(`Prop changed: amountPay=${amountPay} | numeric=${numericAmountPay}`);
            lastLogged.current.amountPay = amountPay;
        }
    }, [open, timeout, amountPay, numericAmountPay]);

    // Reiniciar contador cuando abre o cambia timeout/amountPay
    useEffect(() => {
        if (open) {
            setSecondsLeft(timeout);
            log.debug(`Reinicio contador | secondsLeft=${timeout}`);
        }
    }, [open, timeout, amountPay]);

    // Intervalo de cuenta regresiva
    useEffect(() => {
        if (!open) return;
        log.debug('Inicio intervalo de cuenta regresiva');
        const id = setInterval(() => {
            setSecondsLeft(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        return () => {
            clearInterval(id);
            log.debug('Limpieza intervalo de cuenta regresiva');
        };
    }, [open]);

    // Autocerrar al llegar a 0
    useEffect(() => {
        if (open && secondsLeft === 0) {
            log.warn('Tiempo agotado, cancelando flujo');
            onCancel?.();
        }
    }, [open, secondsLeft, onCancel]);

    const handleCancel = () => {
        log.info('Cancelación solicitada por el usuario');
        onCancel?.();
    };

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
                    <IconButton onClick={handleCancel}>
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
                    onClick={handleCancel}
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
