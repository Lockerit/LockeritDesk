import {
    Close,
    ErrorOutline,
    CheckCircleOutline,
} from '@mui/icons-material';
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
    useCallback,
} from 'react';

import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';
import { formatTime } from '@shared/utils/utils.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'ShowErrorAPI';
const log = logger.scope(fileName);

// Sanear/recortar para logs
function trimForLog(value, max = 240) {
    try {
        const s =
            typeof value === 'string'
                ? value
                : value?.message ?? JSON.stringify(value);
        return String(s).replace(/\s+/g, ' ').trim().slice(0, max);
    } catch {
        return '(msg no serializable)';
    }
}

export const ShowErrorAPI = ({
    open,
    onConfirm,
    msg,
    timeout = 15,
    isError = true,
}) => {
    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const theme = useTheme();

    const msgPreview = useMemo(() => trimForLog(msg), [msg]);
    const config = useElectronConfig();

    useEffect(() => {
        if (!config) return;
    }, [config]);

    // Apertura/cambio de timeout
    useEffect(() => {
        if (!open) return;
        setSecondsLeft(timeout);
        log.info('Modal ShowErrorAPI abierto', {
            isError,
            timeout,
            msg: msgPreview,
        });
    }, [open, timeout, isError, msgPreview]);

    // Tiqueo 1s
    useEffect(() => {
        if (!open || secondsLeft <= 0) return;
        const id = setInterval(
            () => setSecondsLeft((prev) => prev - 1),
            1000
        );
        return () => clearInterval(id);
    }, [open, secondsLeft]);

    // Autocierre por timeout
    useEffect(() => {
        if (!open || secondsLeft !== 0) return;
        log.warn('Modal ShowErrorAPI autocerrado por timeout', {
            timeout,
            msg: msgPreview,
        });
        setSecondsLeft(timeout);
        onConfirm?.();
    }, [open, secondsLeft, onConfirm, timeout, msgPreview]);

    const handleConfirm = useCallback(() => {
        log.info('Modal ShowErrorAPI cerrado por usuario', {
            msg: msgPreview,
        });
        onConfirm?.();
    }, [onConfirm, msgPreview]);

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
                    gap: theme.spacing(2),
                }}
            >
                {isError ? (
                    <ErrorOutline
                        color="error"
                        sx={{ fontSize: theme.spacing(9) }}
                    />
                ) : (
                    <CheckCircleOutline
                        color="success"
                        sx={{ fontSize: theme.spacing(9) }}
                    />
                )}
                <Typography
                    variant="h3"
                    component="span"
                    color="text.primary"
                    sx={{ fontWeight: 'bold', whiteSpace: 'pre-line' }}
                >
                    {typeof msg === 'string'
                        ? msg
                        : msg?.message || JSON.stringify(msg)}
                </Typography>
            </DialogContent>

            <DialogActions
                sx={{
                    display: 'flex',
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
