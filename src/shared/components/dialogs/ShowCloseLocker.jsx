import {
    Close,
    Lock
} from '@mui/icons-material';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Typography,
    Box,
    Slide,
    IconButton
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

const fileName = 'ShowCloseLocker';
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

export const ShowCloseLocker = ({
    open,
    onConfirm,
    msg,
    timeout = 5,
    isError = true,
}) => {
    const [secondsLeft, setSecondsLeft] = useState(timeout);
    const theme = useTheme();

    const alertColor = theme.palette.error.main;
    const themeFactor = Number.isFinite(theme.typography?.fontSize)
        ? theme.typography.fontSize / 14
        : 1;
    const alertPulseScale = 1 + 0.3 * themeFactor;

    const msgPreview = useMemo(() => trimForLog(msg), [msg]);
    const config = useElectronConfig();

    useEffect(() => {
        if (!config) return;
    }, [config]);

    // Apertura/cambio de timeout
    useEffect(() => {
        if (!open) return;
        setSecondsLeft(timeout);
        log.info('Modal ShowCloseLocker abierto', {
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
        log.warn('Modal ShowCloseLocker autocerrado por timeout', {
            timeout,
            msg: msgPreview,
        });
        setSecondsLeft(timeout);
        onConfirm?.();
    }, [open, secondsLeft, onConfirm, timeout, msgPreview]);

    const handleConfirm = useCallback(() => {
        log.info('Modal ShowCloseLocker cerrado por usuario', {
            msg: msgPreview,
        });
        onConfirm?.();
    }, [onConfirm, msgPreview]);

    return (
        <Dialog
            open={open}
            onClose={() => { }}
            keepMounted={false}
            hideBackdrop={false}
            BackdropProps={{
                sx: {
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)',
                },
            }}
            disableEscapeKeyDown
            sx={{
                pointerEvents: 'auto',
                zIndex: 1500,
            }}
            PaperProps={{
                sx: {
                    width: {
                        xs: config?.paramsHtml.isVertical ? '90%' : '85%',
                        sm: config?.paramsHtml.isVertical ? '80%' : '75%',
                        md: config?.paramsHtml.isVertical ? '65%' : '55%',
                        lg: config?.paramsHtml.isVertical ? '50%' : '40%',
                    },
                    maxWidth: 'none',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    height: 'auto',
                    borderRadius: theme.spacing(3),
                    p: theme.spacing(3),
                    boxShadow:
                        '0 10px 50px rgba(0,0,0,0.6), 0 0 50px rgba(255,255,255,0.06)',
                    border: '2px solid rgba(255,255,255,0.06)'
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
                    <IconButton onClick={handleConfirm} sx={{ color: '#ffffff' }}>
                        <Close />
                    </IconButton>
                </Box>
                <DialogTitle sx={{ color: 'inherit', textAlign: 'left' }}>Información</DialogTitle>
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

                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: theme.spacing(2),
                        color: alertColor,
                        animation: 'alertPulse 1.2s infinite',
                        '@keyframes alertPulse': {
                            '0%': { transform: 'scale(1)' },
                            '50%': { transform: `scale(${alertPulseScale})` },
                            '100%': { transform: 'scale(1)' },
                        },
                    }}
                >
                    <Lock
                        sx={{
                            fontSize: { xs: 44, sm: 60, md: 70 },
                        }}
                    />

                    <Typography
                        variant="h1"
                        component="span"
                        color="inherit"
                        sx={{
                            fontWeight: 'bold',
                            fontSize: {
                                xs: theme.typography.h4.fontSize,
                                sm: theme.typography.h3.fontSize,
                                md: theme.typography.h2.fontSize,
                            },
                            lineHeight: 1.1,
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                        }}
                    >
                        {typeof msg === 'string'
                            ? msg
                            : msg?.message || JSON.stringify(msg)}
                    </Typography>
                </Box>
            </DialogContent>
        </Dialog>
    );
};
