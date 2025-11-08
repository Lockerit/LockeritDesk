import {
    AddCircle, Key, RemoveCircle
} from '@mui/icons-material';
import {
    Typography, Box, Grid, Button
} from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { GetAllStatusLockers } from '@services/apis/getAllStatusLockers.js';
import { KeypadNumeric } from '@shared/components/dialogs/KeypadNumeric.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { useUser } from '@shared/context/UserContext.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { speak, stopSpeaking } from '@shared/utils/speak.js';

const fileName = 'Ppal';
const log = logger.scope(fileName);

export const Ppal = () => {
    const [showErrorAPIOpenPpal, setShowErrorAPIOpenPpal] = useState(false);
    const { userInit, setUserInit: _setUserInit } = useUser();
    const [available, setAvailable] = useState(null);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);
    const [timeoutKeypad, setTimeoutKeypad] = useState();
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const [disabledButton, setDisabledButton] = useState(false);
    const [keypadOpen, setKeypadOpen] = useState();
    const [operation, setOperation] = useState();

    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const navigate = useNavigate();
    const config = useElectronConfig();
    const location = useLocation();

    const intervalRef = useRef(null);

    // Solo en montaje
    useEffect(() => {
        log.info(`Montando Ppal | scale=${scale}, size=${JSON.stringify({ w: size.width, h: size.height })}`);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // (Opcional) log explícito de desmontaje real
    useEffect(() => {
        return () => {
            log.info('Desmontando Ppal');
        };
    }, []);

    const speakWelcome = useCallback(() => {
        try {
            stopSpeaking();
            let msg = config?.voice?.message?.welcome || '';
            msg = msg.replace('{{amount}}', config?.paramsHtml?.currency?.coinBoxRequiredAmount || 0);
            msg = msg.replace('{{pesos}}', config?.paramsHtml?.currency?.currencyDescription || 'pesos');
            if (msg) {
                log.debug('TTS: reproducir mensaje de bienvenida');
                speak(msg);
            } else {
                log.debug('TTS: mensaje de bienvenida vacío, no se reproduce');
            }
        } catch (e) {
            log.warn(`TTS: error al reproducir bienvenida: ${e?.message || e}`);
        }
    }, [config]);

    // Forzar detener TTS al cerrar app (evento enviado desde main)
    useEffect(() => {
        const stopSpeech = () => {
            window.speechSynthesis?.cancel?.();
            stopSpeaking();
            log.info('TTS detenido por evento de cierre de app');
        };

        const unsubscribe = window.electronAPI?.onAppClose?.(stopSpeech);

        return () => {
            // solo nos desuscribimos, no llamamos stopSpeech aquí
            if (typeof unsubscribe === 'function') unsubscribe();
        };
    }, []); // sin dependencias

    // Ciclo de TTS de bienvenida/recordatorio
    useEffect(() => {
        if (!config || !config?.voice?.enabled) return;

        // si el modal está abierto, detener audio e intervalos
        if (keypadOpen) {
            log.debug('Keypad abierto → detener TTS/intervalo');
            stopSpeaking();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        const hasWelcomed = localStorage.getItem('hasWelcomed') === 'true';
        if (!hasWelcomed) {
            log.info('TTS bienvenida inicial');
            speakWelcome();
            localStorage.setItem('hasWelcomed', 'true');
        }

        if (!intervalRef.current) {
            const seconds = (config?.voice?.timeInterval || 30);
            intervalRef.current = setInterval(() => {
                speakWelcome();
            }, seconds * 1000);
            log.info(`TTS intervalo configurado cada ${seconds}s`);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
                log.debug('TTS: intervalo limpiado');
            }
            stopSpeaking();
        };
    }, [keypadOpen, config, config?.voice?.enabled, speakWelcome]);

    // Cargar estado de casilleros al montar
    useEffect(() => {
        fetchDataStatusLocker();
    }, []);

    // Habilitar/Deshabilitar botón por disponibilidad
    useEffect(() => {
        setDisabledButton(available === 0);
        log.debug(`Disponibilidad actualizada → available=${available}, disabled=${available === 0}`);
    }, [available]);

    // Validar sesión para posible redirección
    useEffect(() => {
        if (!userInit || !config) return;

        const isAuthenticated = Boolean(userInit?.authenticatedOpera || userInit?.authenticatedAdmin);
        const isSessionClosed = Boolean(userInit?.closeSession || userInit?.closeWindow);

        if ((!isAuthenticated || isSessionClosed) && location.pathname !== '/') {
            log.info(`Redirigir a / por sesión inválida o cerrada | auth=${isAuthenticated}, closeSession=${!!userInit?.closeSession}, closeWindow=${!!userInit?.closeWindow}`);
            navigate('/', { replace: true });
            return;
        }

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutKeypad(config?.paramsHtml?.modalTimeouts?.timeoutKeypad);
            log.debug(`timeoutKeypad configurado a ${config.paramsHtml.modalTimeouts.timeoutKeypad}ms`);
        }
    }, [config, userInit, navigate, location]);

    // Timeout de mensajes
    useEffect(() => {
        if (!config) return;
        if (config?.paramsHtml?.modalTimeouts?.timeoutShowMessage) {
            setTimeoutShowMessage(config.paramsHtml.modalTimeouts.timeoutShowMessage);
            log.debug(`timeoutShowMessage configurado a ${config.paramsHtml.modalTimeouts.timeoutShowMessage}ms`);
        }
    }, [config]);

    const fetchDataStatusLocker = async () => {
        setLoading(true);
        log.info('Cargar estado de casilleros');
        try {
            const result = await GetAllStatusLockers();
            if (result.success) {
                if (Array.isArray(result?.data?.general)) {
                    const libre = result.data.general.find(item => item.status?.toLowerCase() === 'libre');
                    setAvailable(libre?.total || 0);
                    log.info(`Estados cargados OK | libres=${libre?.total || 0}`);
                } else {
                    log.warn('Respuesta sin sección general válida');
                }
                setShowErrorAPIOpenPpal(false);
            } else {
                const msg = typeof result?.data === 'string'
                    ? result.data
                    : 'No se puedo obtener estado de casilleros';
                setMessageErrorAPI(msg);
                setShowErrorAPIOpenPpal(true);
                log.warn(`Fallo carga de estados: ${msg}`);
            }
        } catch (e) {
            setMessageErrorAPI('No se puedo obtener estado de casilleros');
            setShowErrorAPIOpenPpal(true);
            log.error(`Error en GetAllStatusLockers: ${e?.message || e}`);
        } finally {
            setLoading(false);
        }
    };

    const ActionButton = ({ text, icon, color, onClick, disabled }) => (
        <Button
            variant="contained"
            color={color}
            onClick={onClick}
            fullWidth
            disabled={disabled}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textTransform: 'none',
                fontSize: 52 * scale,
                padding: 2 * scale,
                width: '100%',
                height: '100%',
                borderRadius: `${24 * scale}px`,
                boxShadow: `0 ${18 * scale}px ${12 * scale}px rgba(0,0,0,1)`,
            }}
        >
            {text}
            {icon}
        </Button>
    );

    const confirmShowErrorAPI = () => {
        setShowErrorAPIOpenPpal(false);
        log.debug('Cierre modal ErrorAPI');
    };

    const saveLocker = () => {
        setOperation('Guardar');
        setKeypadOpen(true);
        log.info('Operación seleccionada: Guardar → abrir keypad');
    };

    const removeLocker = () => {
        setOperation('Retirar');
        setKeypadOpen(true);
        log.info('Operación seleccionada: Retirar → abrir keypad');
    };

    const reserveLocker = () => {
        setOperation('Reservado');
        setKeypadOpen(true);
        log.info('Operación seleccionada: Reservado → abrir keypad');
    };

    const closeKeypad = () => {
        setKeypadOpen(false);
        log.info('Cerrar keypad → refrescar estados');
        fetchDataStatusLocker();
    };

    return (
        <>
            <Box
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignContent: 'center',
                    alignItems: 'center',
                    px: 4 * scale,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden',
                }}
            >
                <Box>
                    {config?.login?.logoPath && (
                        <img
                            src={config?.login?.logoPath}
                            alt="Título"
                            style={{ height: 180 * scale }}
                        />
                    )}
                </Box>

                {/* Botones */}
                <Grid
                    container
                    spacing={5 * scale}
                    sx={{
                        height: scaledDimension(
                            {
                                xs: { base: 70, min: 65, max: 75 },
                                sm: { base: 70, min: 65, max: 75 },
                                md: { base: 60, min: 55, max: 70 },
                                lg: { base: 60, min: 55, max: 70 },
                            },
                            scale
                        ),
                        width: scaledDimension(
                            {
                                xs: { base: 80, min: 75, max: 85 },
                                sm: { base: 80, min: 75, max: 85 },
                                md: { base: 60, min: 55, max: 70 },
                                lg: { base: 45, min: 40, max: 50 },
                            },
                            scale
                        ),
                    }}
                >
                    <Grid size={6}>
                        <ActionButton
                            text="Guardar"
                            icon={<AddCircle sx={{ fontSize: 100 * scale, mb: 0.5 * scale }} />}
                            color="primary"
                            onClick={saveLocker}
                            disabled={disabledButton}
                        />
                    </Grid>

                    {config?.reserve?.enabled ? (
                        <Grid size={6} container direction="column">
                            <Grid sx={{ flex: 1 }}>
                                <ActionButton
                                    text="Retirar"
                                    icon={<RemoveCircle sx={{ fontSize: 100 * scale, mb: 0.5 * scale }} />}
                                    color="secondary"
                                    onClick={removeLocker}
                                />
                            </Grid>
                            <Grid sx={{ flex: 1 }}>
                                <ActionButton
                                    text="Reservado"
                                    icon={<Key sx={{ fontSize: 100 * scale, mb: 0.5 * scale }} />}
                                    color="info"
                                    onClick={reserveLocker}
                                />
                            </Grid>
                        </Grid>
                    ) : (
                        <Grid size={6}>
                            <ActionButton
                                text="Retirar"
                                icon={<RemoveCircle sx={{ fontSize: 100 * scale, mb: 0.5 * scale }} />}
                                color="secondary"
                                onClick={removeLocker}
                            />
                        </Grid>
                    )}
                </Grid>

                {/* Indicadores */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        width: '100%',
                        maxHeight: '100%',
                        mt: 'auto',
                    }}
                >
                    <Box>
                        {!disabledButton ? (
                            <>
                                <Typography variant="h3" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                                    Casilleros disponibles:{' '}
                                </Typography>
                                <Typography variant="h3" component="span" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    {available || 0}
                                </Typography>
                            </>
                        ) : (
                            <Typography variant="h3" component="span" color="error" sx={{ fontWeight: 'bold' }}>
                                No hay casilleros disponibles
                            </Typography>
                        )}
                    </Box>

                    {config?.login?.QRPath && (
                        <Box
                            sx={{
                                position: 'fixed',
                                bottom: 16 * scale,
                                right: 16 * scale,
                                height: scaledDimension(
                                    {
                                        xs: { base: 140, min: 135, max: 145 },
                                        sm: { base: 140, min: 135, max: 145 },
                                        md: { base: 160, min: 155, max: 165 },
                                        lg: { base: 170, min: 165, max: 175 },
                                    },
                                    scale,
                                    'px'
                                ),
                                zIndex: 1000,
                                pointerEvents: 'none',
                            }}
                        >
                            <img
                                src={config.login.QRPath}
                                alt="QR"
                                style={{ width: 'auto', height: '100%', objectFit: 'contain' }}
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

            {loading && (<Loading />)}
        </>
    );
};
