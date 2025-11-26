import { Close } from '@mui/icons-material';
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
import { useTheme } from '@mui/material/styles';
import {
    useState,
    forwardRef,
    useEffect,
    useMemo,
    useRef,
} from 'react';

import { Progressbar } from '@shared/components/bars/Progressbar.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';
import { formatTime } from '@shared/utils/utils.js';

import { MoneyLoading } from './MoneyLoading';

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
    const theme = useTheme();
    const config = useElectronConfig();

    const lastLogged = useRef({
        open: undefined,
        amountPay: undefined,
        timeout: undefined,
    });

    // Normaliza monto pagado a número (solo para logs)
    const numericAmountPay = useMemo(() => {
        const n = Number(String(amountPay ?? '').replace(/[^0-9.-]+/g, ''));
        return Number.isFinite(n) ? n : 0;
    }, [amountPay]);

    useEffect(() => {
        if (!config) return;
    }, [config]);

    useEffect(() => {
        if (open) {
            const t = Number(timeout);
            const safe = Number.isFinite(t) && t > 0 ? t : 120;
            setSecondsLeft(safe);
        }
    }, [open, timeout]);

    useEffect(() => {
        log.info(`Montaje | timeout=${timeout} | phone=${phone ?? ''}`);
        return () => {
            log.debug('Desmontaje');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Log de cambios relevantes
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
            log.debug(
                `Prop changed: amountPay=${amountPay} | numeric=${numericAmountPay}`
            );
            lastLogged.current.amountPay = amountPay;
        }
    }, [open, timeout, amountPay, numericAmountPay]);

    // Reiniciar contador cuando abre o cambia timeout
    useEffect(() => {
        if (open) {
            const t = Number(timeout);
            const safe = Number.isFinite(t) && t > 0 ? t : 600;
            setSecondsLeft(safe);
            log.debug(`Reinicio contador | secondsLeft=${safe}`);
        }
    }, [open, timeout]);

    // Intervalo de cuenta regresiva
    useEffect(() => {
        if (!open) return;
        const id = setInterval(() => {
            setSecondsLeft(prev => {
                const next = prev - 1;
                return next;
            });
        }, 1000);
        return () => {
            clearInterval(id);
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
            sx={{ pointerEvents: 'auto', zIndex: 1500 }}
            PaperProps={{
                sx: {
                    width: {
                        xs: config?.paramsHtml.isVertical ? '50%' : '40%',
                        sm: config?.paramsHtml.isVertical ? '50%' : '40%',
                        md: config?.paramsHtml.isVertical ? '50%' : '30%',
                        lg: config?.paramsHtml.isVertical ? '50%' : '30%',
                    },
                    maxWidth: 'none',
                    height: 'auto',
                    borderRadius: theme.spacing(3),
                    p: theme.spacing(3),
                },
            }}
            slots={{ transition: Transition }}
        >
            {/* Header con timer y close */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing(2),
                    position: 'relative',
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: theme.spacing(1),
                        position: 'absolute',
                        right: theme.spacing(1),
                        top: theme.spacing(1),
                    }}
                >
                    <Typography variant="body2">
                        {formatTime(secondsLeft)}
                    </Typography>
                    <IconButton onClick={handleCancel}>
                        <Close />
                    </IconButton>
                </Box>

                <DialogTitle>Realizando pago</DialogTitle>
            </Box>

            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                }}
            >
                <Typography
                    variant="h4"
                    sx={{
                        textAlign: 'center',
                        mt: theme.spacing(2),
                        mb: theme.spacing(3),
                    }}
                >
                    Por favor deposite el dinero:
                </Typography>

                <Typography
                    variant="h1"
                    sx={{
                        textAlign: 'center',
                        fontWeight: 'bold',
                        mt: theme.spacing(2),
                        mb: theme.spacing(3),
                    }}
                >
                    {phone}
                </Typography>

                <Box textAlign="center">
                    <Typography
                        variant="h4"
                        component="span"
                        color="text.primary"
                        sx={{ fontWeight: 'bold' }}
                    >
                        Valor del servicio:{' '}
                    </Typography>
                    <Typography
                        variant="h2"
                        component="span"
                        color="error"
                        sx={{ fontWeight: 'bold' }}
                    >
                        {amountService}
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        gap: theme.spacing(3),
                        m: theme.spacing(5),
                    }}
                >
                    <MoneyLoading />
                    <Progressbar
                        msg="Valor ingresado:"
                        amountPay={amountPay}
                        amountService={amountService}
                    />
                </Box>
            </DialogContent>

            <DialogActions
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                    width: '100%',
                }}
            >
                <Button
                    onClick={handleCancel}
                    autoFocus
                    color="secondary"
                    variant="contained"
                    fullWidth
                    sx={{
                        mx: theme.spacing(3),
                        py: theme.spacing(2),
                    }}
                >
                    Cancelar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
