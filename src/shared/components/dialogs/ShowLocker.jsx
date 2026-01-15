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
    Paper,
    IconButton,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
    useState,
    forwardRef,
    useEffect,
    useMemo,
    useCallback,
} from 'react';

import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';
import { formatTime } from '@shared/utils/utils.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'ShowLocker';
const log = logger.scope(fileName);

// Recorta mensajes para el log
const trimMsg = (v, max = 180) => {
    try {
        const s =
            typeof v === 'string'
                ? v
                : v?.message ?? JSON.stringify(v);
        return String(s).replace(/\s+/g, ' ').trim().slice(0, max);
    } catch {
        return '(msg no serializable)';
    }
};

export const ShowLocker = ({
    open,
    onConfirm,
    locker,
    title,
    msg,
    timeout = 15,
    backColor = 'gray',
    operation,
}) => {
    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const msgPreview = useMemo(() => trimMsg(msg), [msg]);
    const theme = useTheme();
    const config = useElectronConfig();

    useEffect(() => {
        if (!config) return;
    }, [config]);

    // Abre / cambia timeout
    useEffect(() => {
        if (!open) return;
        setSecondsLeft(timeout);
        log.info('modal abierto', {
            operation,
            locker,
            timeout,
            msg: msgPreview,
        });
    }, [open, timeout, operation, locker, msgPreview]);

    // Tiqueo 1s
    useEffect(() => {
        if (!open || secondsLeft <= 0) return;
        const id = setInterval(
            () => setSecondsLeft((p) => p - 1),
            1000
        );
        return () => clearInterval(id);
    }, [open, secondsLeft]);

    // Autocierre por timeout
    useEffect(() => {
        if (!open || secondsLeft !== 0) return;
        log.warn('modal autocerrado por timeout', {
            operation,
            locker,
            timeout,
        });
        setSecondsLeft(timeout);
        onConfirm?.();
    }, [open, secondsLeft, onConfirm, timeout, operation, locker]);

    const handleConfirm = useCallback(() => {
        log.info('modal cerrado por usuario', {
            operation,
            locker,
        });
        onConfirm?.();
    }, [onConfirm, operation, locker]);

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
                        xs: config?.paramsHtml.isVertical ? '90%' : '85%',
                        sm: config?.paramsHtml.isVertical ? '80%' : '75%',
                        md: config?.paramsHtml.isVertical ? '60%' : '50%',
                        lg: config?.paramsHtml.isVertical ? '50%' : '40%',
                    },
                    maxWidth: 'none',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    height: 'auto',
                    borderRadius: theme.spacing(3),
                    p: theme.spacing(3),
                    display: 'flex',
                    flexDirection: 'column',
                },
            }}
            slots={{ transition: Transition }}
        >
            {/* Encabezado con timer y botón cerrar */}
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: theme.spacing(1),
                    position: 'absolute',
                    right: theme.spacing(2),
                    top: theme.spacing(2),
                }}
            >
                <Typography variant="body2">
                    {formatTime(secondsLeft)}
                </Typography>
                <IconButton onClick={handleConfirm}>
                    <Close />
                </IconButton>
            </Box>

            <DialogTitle sx={{ textAlign: 'center' }}>
                Apertura de casillero
            </DialogTitle>

            {/* Contenido */}
            <DialogContent
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    textAlign: 'center',
                    p: 0,
                    mt: theme.spacing(1),
                }}
            >
                <Typography
                    variant="h3"
                    sx={{
                        mt: theme.spacing(2),
                        fontWeight: 'bold',
                    }}
                >
                    {title}
                </Typography>

                <Paper
                    elevation={24}
                    sx={{
                        width: {
                            xs: '70%',
                            sm: '65%',
                            md: '60%',
                        },
                        minHeight: {
                            xs: theme.spacing(18),
                            sm: theme.spacing(24),
                            md: theme.spacing(28),
                        },
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: backColor || 'primary.main',
                        color: 'error.contrastText',
                        mt: theme.spacing(3),
                        mb: theme.spacing(3),
                    }}
                >
                    <Typography
                        variant="h1"
                        sx={{ fontWeight: 'bold' }}
                    >
                        {locker}
                    </Typography>
                </Paper>

                <Typography
                    variant="h4"
                    sx={{
                        px: theme.spacing(2),
                        py: theme.spacing(1),
                        whiteSpace: 'pre-line',
                    }}
                >
                    {msg}
                </Typography>

                {(operation === 'Retirar' ||
                    operation === 'Guardar' ||
                    operation === 'Reservado') && (
                        <Typography
                            variant="h1"
                            color='error.main'
                            sx={{
                                fontWeight: 'bold',
                                py: theme.spacing(2),
                            }}
                        >
                            ¡Por favor dejar el casillero cerrado!
                        </Typography>
                    )}

                {operation === 'Retirar' && (
                    <Typography variant="h5" sx={{ pb: theme.spacing(2) }}>
                        Disponible para una nueva asignación.
                    </Typography>
                )}
            </DialogContent>

            {/* Acciones */}
            <DialogActions
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                }}
            >
                <Button
                    onClick={handleConfirm}
                    autoFocus
                    color="primary"
                    variant="contained"
                    fullWidth
                    sx={{
                        mx: theme.spacing(3),
                        py: theme.spacing(2),
                    }}
                >
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>
    );
};
