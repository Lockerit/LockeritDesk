import { useState, forwardRef, useEffect } from 'react';
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
    CurrencyExchange,
    Close
} from '@mui/icons-material';
import LoadingBar from '../bar/progressbar.jsx'
import {
    formatTime
} from '../utils/utils.js';
import { speak } from '../utils/speak.js'

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'InsertMoney';

export default function InsertMoney({ open, onCancel, amountService, amountPay, timeout = 600 }) {

    const [secondsLeft, setSecondsLeft] = useState(timeout);

    useEffect(() => {

        const numericAmount = Number(amountPay.replace(/[^0-9.-]+/g, ''));

        if (numericAmount === 0) return;

        // speak(`${numericAmount} Pesos`);
    }, [amountPay]);

    useEffect(() => {
        if (open) {
            setSecondsLeft(timeout); // reinicia cada vez que abre
        }
    }, [open, amountPay, timeout]);

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
                onCancel();
            }, 0);
        }
    }, [open, secondsLeft, onCancel]);

    return (
        <Dialog open={open} onClose={(event, reason) => {
            if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                setTimeout(() => onCancel(), 0); // diferir para evitar el warning
            }

        }}
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    width: '40vw',
                    height: 'auto',
                    maxWidth: '90vw',
                    borderRadius: 4,
                    p: 2
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
                    <IconButton onClick={onCancel}>
                        <Close />
                    </IconButton>
                </Box>

                {/* Texto centrado */}
                <DialogTitle>
                    Realizando pago
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
                <Typography variant="h4" sx={{ textAlign: 'center', mt: 2, mb: 3 }}>
                    Por favor deposite el dinero:
                </Typography>
                <Box textAlign="center">
                    <Typography variant="h4" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                        Valor del servicio:{' '}
                    </Typography>
                    <Typography variant="h4" component="span" color="error" sx={{ fontWeight: 'bold' }}>
                        {amountService}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2, m: 5 }}>
                    <CurrencyExchange color="primary" sx={{ fontSize: 150 }} />
                    <LoadingBar msg={'Valor ingresado:'} amountPay={amountPay} />
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
                <Button onClick={onCancel} color="secondary" variant="contained" fullWidth sx={{ mr: 3, ml: 3, p: 3 }}>
                    Cancelar
                </Button>
            </DialogActions>
        </Dialog>
    );
}
