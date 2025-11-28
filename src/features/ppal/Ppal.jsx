import { AddCircle, Key, RemoveCircle } from '@mui/icons-material';
import { Typography, Box, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { GetAllStatusLockers } from '@services/apis/getAllStatusLockers.js';
import { KeypadNumeric } from '@shared/components/dialogs/KeypadNumeric.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { useUser } from '@shared/context/UserContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';
import { speak, stopSpeaking } from '@shared/utils/speak.js';

const fileName = 'Ppal';
const log = logger.scope(fileName);

export const Ppal = () => {
    const [showErrorAPIOpenPpal, setShowErrorAPIOpenPpal] = useState(false);
    const { userInit } = useUser();
    const [available, setAvailable] = useState(null);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);
    const [timeoutKeypad, setTimeoutKeypad] = useState();
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const [disabledButton, setDisabledButton] = useState(false);
    const [keypadOpen, setKeypadOpen] = useState(false);
    const [operation, setOperation] = useState();

    const navigate = useNavigate();
    const config = useElectronConfig();
    const location = useLocation();
    const intervalRef = useRef(null);
    const theme = useTheme();

    useEffect(() => {
        log.info('Montando Ppal');
    }, []);

    useEffect(() => {
        return () => {
            log.info('Desmontando Ppal');
        };
    }, []);

    const speakWelcome = useCallback(() => {
        try {
            stopSpeaking();
            let msg = config?.voice?.message?.welcome || '';
            msg = msg.replace(
                '{{amount}}',
                config?.paramsHtml?.currency?.coinBoxRequiredAmount || 0
            );
            msg = msg.replace(
                '{{pesos}}',
                config?.paramsHtml?.currency?.currencyDescription || 'pesos'
            );
            if (msg) {
                speak(msg);
            }
        } catch (e) {
            log.warn(`TTS error bienvenida: ${e?.message || e}`);
        }
    }, [config]);

    useEffect(() => {
        const stopSpeech = () => {
            window.speechSynthesis?.cancel?.();
            stopSpeaking();
            log.info('TTS detenido por cierre de app');
        };

        const unsubscribe = window.electronAPI?.onAppClose?.(stopSpeech);
        return () => {
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []);

    useEffect(() => {
        if (!config || !config?.voice?.enabled) return;

        if (keypadOpen) {
            stopSpeaking();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const hasWelcomed = localStorage.getItem('hasWelcomed') === 'true';
        if (!hasWelcomed) {
            speakWelcome();
            localStorage.setItem('hasWelcomed', 'true');
        }

        if (!intervalRef.current) {
            const seconds = config?.voice?.timeInterval || 30;
            intervalRef.current = setInterval(() => {
                speakWelcome();
            }, seconds * 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            stopSpeaking();
        };
    }, [keypadOpen, config, speakWelcome]);

    useEffect(() => {
        fetchDataStatusLocker();
    }, []);

    useEffect(() => {
        setDisabledButton(available === 0);
    }, [available]);

    useEffect(() => {
        if (!userInit || !config) return;

        const isAuthenticated = Boolean(
            userInit?.authenticatedOpera || userInit?.authenticatedAdmin
        );
        const isSessionClosed = Boolean(
            userInit?.closeSession || userInit?.closeWindow
        );

        if (!isAuthenticated || isSessionClosed) {
            if (location.pathname !== '/') {
                navigate('/', { replace: true });
            }
            return;
        }

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutKeypad(config.paramsHtml.modalTimeouts.timeoutKeypad);
        }
    }, [config, userInit, navigate, location]);

    useEffect(() => {
        if (!config) return;
        if (config?.paramsHtml?.modalTimeouts?.timeoutShowMessage) {
            setTimeoutShowMessage(config.paramsHtml.modalTimeouts.timeoutShowMessage);
        }
    }, [config]);

    const fetchDataStatusLocker = async () => {
        setLoading(true);
        try {
            const result = await GetAllStatusLockers();
            if (result.success) {
                if (Array.isArray(result?.data?.general)) {
                    const libre = result.data.general.find(
                        (item) => item.status?.toLowerCase() === 'libre'
                    );
                    setAvailable(libre?.total || 0);
                }
                setShowErrorAPIOpenPpal(false);
            } else {
                const msg =
                    typeof result?.data === 'string'
                        ? result.data
                        : 'No se puedo obtener estado de casilleros';
                setMessageErrorAPI(msg);
                setShowErrorAPIOpenPpal(true);
            }
        } catch (e) {
            setMessageErrorAPI('No se puedo obtener estado de casilleros');
            setShowErrorAPIOpenPpal(true);
            log.error(`Error estados: ${e?.message || e}`);
        } finally {
            setLoading(false);
        }
    };

    const ActionButton = ({ text, icon, color, onClick, disabled }) => (
        <Button
            variant="contained"
            color={color}
            onClick={onClick}
            disabled={disabled}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'none',
                fontSize: theme.typography.h1.fontSize,
                p: theme.spacing(2),
                width: '100%',
                height: '100%',
                borderRadius: theme.spacing(3),
                boxShadow: theme.shadows[8],
            }}
            fullWidth
        >
            {text}
            {icon}
        </Button>
    );

    const confirmShowErrorAPI = () => {
        setShowErrorAPIOpenPpal(false);
    };

    const saveLocker = () => {
        setOperation('Guardar');
        setKeypadOpen(true);
    };

    const removeLocker = () => {
        setOperation('Retirar');
        setKeypadOpen(true);
    };

    const reserveLocker = () => {
        setOperation('Reservado');
        setKeypadOpen(true);
    };

    const closeKeypad = () => {
        setKeypadOpen(false);
        fetchDataStatusLocker();
    };

    return (
        <>
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    px: { xs: 2, sm: 4 },
                    py: { xs: 2, sm: 3 },
                    width: '100%',
                    height: '98%',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                }}
            >
                {/* Logo */}
                <Box
                    sx={{
                        mb: { xs: 2, md: 3 },
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                    }}
                >
                    {config?.login?.logoPath && (
                        <img
                            src={config.login.logoPath}
                            alt="Título"
                            style={{
                                maxHeight: theme.spacing(18),
                                objectFit: 'contain',
                            }}
                            onClick={fetchDataStatusLocker}
                        />
                    )}
                </Box>

                {/* Layout de botones como en la imagen */}
                <Box
                    sx={{
                        flexGrow: 1,
                        width: {
                            xs: config?.paramsHtml?.isVertical ? '80%' : '80%',
                            sm: config?.paramsHtml?.isVertical ? '80%' : '80%',
                            md: config?.paramsHtml?.isVertical ? '70%' : '60%',
                            lg: config?.paramsHtml?.isVertical ? '60%' : '50%',
                        },
                        display: {
                            xs: 'flex',
                            sm: 'grid',       // grid desde sm (>=600)
                        },
                        flexDirection: {
                            xs: 'column',     // solo en xs se apilan
                        },
                        gridTemplateColumns: {
                            sm: '1fr 1fr',  // 2 columnas desde sm
                        },
                        gridTemplateRows: {
                            sm: '1fr 1fr',    // 2 filas desde sm
                        },
                        gap: { xs: 3, sm: 4 },
                        alignItems: 'stretch',
                    }}
                >
                    {/* Guardar: columna izquierda, ocupa las dos filas */}
                    <Box
                        sx={{
                            gridColumn: { sm: '1' },
                            gridRow: { sm: '1 / span 2' },
                            mb: { xs: 2, sm: 0 },
                        }}
                    >
                        <ActionButton
                            text="Guardar"
                            icon={
                                <AddCircle
                                    sx={{
                                        fontSize: theme.spacing(15),
                                        mt: 1,
                                    }}
                                />
                            }
                            color="primary"
                            onClick={saveLocker}
                            disabled={disabledButton}
                        />
                    </Box>

                    {config?.reserve?.enabled ? (
                        <>
                            {/* Retirar: arriba derecha */}
                            <Box
                                sx={{
                                    gridColumn: { sm: '2' },
                                    gridRow: { sm: '1' },
                                    mb: { xs: 2, sm: 0 },
                                }}
                            >
                                <ActionButton
                                    text="Retirar"
                                    icon={
                                        <RemoveCircle
                                            sx={{
                                                fontSize: theme.spacing(15),
                                                mt: 1,
                                            }}
                                        />
                                    }
                                    color="secondary"
                                    onClick={removeLocker}
                                />
                            </Box>

                            {/* Reservado: abajo derecha */}
                            <Box
                                sx={{
                                    gridColumn: { sm: '2' },
                                    gridRow: { sm: '2' },
                                }}
                            >
                                <ActionButton
                                    text="Reservado"
                                    icon={
                                        <Key
                                            sx={{
                                                fontSize: theme.spacing(15),
                                                mt: 1,
                                            }}
                                        />
                                    }
                                    color="info"
                                    onClick={reserveLocker}
                                />
                            </Box>
                        </>
                    ) : (
                        // Si no hay reserva, Retirar ocupa la columna derecha completa
                        <Box
                            sx={{
                                gridColumn: { sm: '2' },
                                gridRow: { sm: '1 / span 2' },
                            }}
                        >
                            <ActionButton
                                text="Retirar"
                                icon={
                                    <RemoveCircle
                                        sx={{
                                            fontSize: theme.spacing(15),
                                            mt: 1,
                                        }}
                                    />
                                }
                                color="secondary"
                                onClick={removeLocker}
                            />
                        </Box>
                    )}
                </Box>

                {/* Indicadores y QR */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        mt: { xs: 3, md: 4 },
                        justifyContent: 'space-between',
                        gap: 2,
                    }}
                >
                    <Box>
                        {!disabledButton ? (
                            <>
                                <Typography
                                    variant="h1"
                                    component="span"
                                    sx={{ fontWeight: 'bold' }}
                                    color="text.primary"
                                >
                                    Casilleros disponibles:{' '}
                                </Typography>
                                <Typography
                                    variant="h1"
                                    component="span"
                                    sx={{ fontWeight: 'bold' }}
                                    color="text.secondary"
                                >
                                    {available || 0}
                                </Typography>
                            </>
                        ) : (
                            <Typography
                                variant="h1"
                                component="span"
                                sx={{ fontWeight: 'bold' }}
                                color="error"
                            >
                                No hay casilleros disponibles
                            </Typography>
                        )}
                    </Box>

                    {config?.login?.QRPath && (
                        <Box
                            sx={{
                                position: 'fixed',
                                bottom: theme.spacing(2),
                                right: theme.spacing(2),
                                height: {
                                    xs: theme.spacing(16),
                                    sm: theme.spacing(18),
                                    md: theme.spacing(20),
                                    lg: theme.spacing(22),
                                },
                                zIndex: 1000,
                                pointerEvents: 'none',
                            }}
                        >
                            <img
                                src={config.login.QRPath}
                                alt="QR"
                                style={{
                                    width: 'auto',
                                    height: '100%',
                                    objectFit: 'contain',
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </Box>

            <KeypadNumeric
                open={keypadOpen}
                onClose={closeKeypad}
                operation={operation}
                timeout={timeoutKeypad}
            />

            <ShowErrorAPI
                open={showErrorAPIOpenPpal}
                onConfirm={confirmShowErrorAPI}
                msg={messageErrorAPI}
                timeout={timeoutShowMessage}
            />

            {loading && <Loading />}
        </>
    );
};
