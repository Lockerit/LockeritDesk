import {
    AddCircle, Key, RemoveCircle
} from '@mui/icons-material';
import {
    Typography, Box, Grid, Button
} from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';



import { GetAllStatusLockers } from '@services/apis/getAllStatusLockers.js';
import { KeypadNumeric } from '@shared/components/dialogs/KeypadNumeric.jsx'
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { useModal } from '@shared/context/ModalContext.jsx';
import { useUser } from '@shared/context/UserContext.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { speak, stopSpeaking } from '@shared/utils/speak.js';

const fileName = 'Ppal';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export const Ppal = () => {

    const [showErrorAPIOpenPpal, setShowErrorAPIOpenPpal] = useState(false);
    const { userInit, setUserInit: _setUserInit } = useUser();
    const [available, setAvailable] = useState(null);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);
    const [timeoutKeypad, setTimeoutKeypad] = useState();
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const [disabledButton, setDisabledButton] = useState(false);
    const size = useWindowSizeContext();

    log('debug', `size ${JSON.stringify(size)}`)

    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    const navigate = useNavigate();
    const config = useElectronConfig();
    const location = useLocation();
    const {
        keypadOpen, setKeypadOpen, operation, setOperation
    } = useModal();

    const intervalRef = useRef(null);

    const speakWelcome = useCallback(() => {
        stopSpeaking();
        let msg = config?.voice?.message?.welcome || "";
        msg = msg.replace("{{amount}}", config?.paramsHtml?.currency?.coinBoxRequiredAmount || 0);
        msg = msg.replace("{{pesos}}", config?.paramsHtml?.currency?.currencyPesos || "pesos");
        speak(msg || "");
    }, [config]);

    useEffect(() => {
        const stopSpeech = () => {
            try {
                window.speechSynthesis.cancel(); // fuerza parar siempre
            } catch (e) {
                console.warn("Error al cancelar TTS:", e);
            }
        };

        // escuchar evento enviado desde main
        window.electronAPI?.onAppClose(stopSpeech);

        return () => {
            stopSpeech(); // limpiar si desmonta el componente
        };
    }, [config?.voice?.enabled]);

    useEffect(() => {
        if (!config || !config?.voice?.enabled) return;

        // Si el modal está abierto, detener audio e intervalos
        if (keypadOpen) {
            stopSpeaking();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            return;
        }

        // Verificar si ya dimos la bienvenida antes (persistente)
        const hasWelcomed = localStorage.getItem("hasWelcomed") === "true";

        if (!hasWelcomed) {
            speakWelcome();
            localStorage.setItem("hasWelcomed", "true"); // persiste
        }

        // Crear intervalo si no existe
        if (!intervalRef.current) {
            intervalRef.current = setInterval(() => {
                speakWelcome();
            }, (config?.voice?.timeInterval || 30) * 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            stopSpeaking();
        };
    }, [keypadOpen, config, config?.voice?.enabled, speakWelcome]);

    useEffect(() => {
        fetchDataStatusLocker();
    }, []);

    useEffect(() => {
        setDisabledButton(available === 0);
    }, [available]);

    useEffect(() => {
        if (!userInit || !config) return;

        // DEBUG: escribe en logs para ver por qué redirige
        log('debug', `ppal useEffect -> userInit: ${JSON.stringify(userInit)}`);

        const isAuthenticated = Boolean(userInit?.authenticatedOpera || userInit?.authenticatedAdmin);
        const isSessionClosed = Boolean(userInit?.closeSession || userInit?.closeWindow);

        // Redirigir solo si NO está autenticado o la sesión está marcada como cerrada
        // y además sólo si no estamos ya en la ruta raíz para evitar loops.
        if ((!isAuthenticated || isSessionClosed) && location.pathname !== '/') {
            log('info', `Redirigiendo a / — authenticated=${isAuthenticated}, closeSession=${userInit?.closeSession}, closeWindow=${userInit?.closeWindow}`);
            navigate('/', { replace: true });
            return;
        }

        // Mantén la lógica que setea el timeout del keypad
        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutKeypad(config?.paramsHtml?.modalTimeouts?.timeoutKeypad);
        }
    }, [config, userInit, navigate, location]);

    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
        }

    }, [config]);

    const fetchDataStatusLocker = async () => {
        setLoading(true);
        try {
            const result = await GetAllStatusLockers();

            if (result.success) {
                if (Array.isArray(result?.data?.general)) {
                    const libre = result?.data?.general.find(item => item.status.toLowerCase() === "libre");
                    setAvailable(libre?.total || 0);
                }
                setShowErrorAPIOpenPpal(false);
            } else {
                const msg = typeof result?.data === 'string'
                    ? result.data
                    : 'No se puedo obtener estado de casilleros';

                setMessageErrorAPI(msg);
                setShowErrorAPIOpenPpal(true);
            }

        } catch (_err) {
            log('error', `Error al obtener estado de casilleros: ${_err.message || _err}`);
            setMessageErrorAPI('No se puedo obtener estado de casilleros');
            setShowErrorAPIOpenPpal(true);
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
    };

    const saveLocker = () => {
        setOperation('Guardar');
        setKeypadOpen(true);
    }

    const removeLocker = () => {
        setOperation('Retirar');
        setKeypadOpen(true);
    }

    const reserveLocker = () => {
        setOperation('Reservado');
        setKeypadOpen(true);
    }

    const closeKeypad = () => {
        setKeypadOpen(false);
        fetchDataStatusLocker();
    };

    return (
        <>
            <Box
                sx={{
                    flex: 1, // ocupa todo el espacio disponible del contenedor padre
                    display: 'flex',
                    flexDirection: 'column',
                    alignContent: 'center',
                    alignItems: 'center',
                    px: 4 * scale,
                    width: '100%',
                    height: '100%',
                    overflow: 'hidden', // evita que genere scroll
                }}
            >
                <Box>
                    {config?.login?.logoPath && (<img
                        src={config?.login?.logoPath}
                        alt="Título"
                        style={{ height: 180 * scale }}
                    />
                    )}
                </Box>

                {/* Botones */}
                <Grid container spacing={5 * scale}
                    sx={{
                        height: scaledDimension(
                            {
                                xs: { base: 70, min: 65, max: 75 }, // en % para mobile
                                sm: { base: 70, min: 65, max: 75 }, // tablet
                                md: { base: 60, min: 55, max: 70 }, // desktop medio
                                lg: { base: 60, min: 55, max: 70 }, // desktop grande
                            },
                            scale
                        ),
                        width: scaledDimension(
                            {
                                xs: { base: 80, min: 75, max: 85 }, // en % para mobile
                                sm: { base: 80, min: 75, max: 85 }, // tablet
                                md: { base: 60, min: 55, max: 70 }, // desktop medio
                                lg: { base: 45, min: 40, max: 50 }, // desktop grande
                            },
                            scale
                        ),
                    }}>
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
                    {/* Contenido de texto (a la izquierda) */}
                    <Box>
                        {!disabledButton && (
                            <>
                                <Typography variant="h3" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                                    Casilleros disponibles:{' '}
                                </Typography>
                                <Typography variant="h3" component="span" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    {available || 0}
                                </Typography>
                            </>
                        )}
                        {disabledButton && (
                            <>
                                <Typography variant="h3" component="span" color="error" sx={{ fontWeight: 'bold' }}>
                                    No hay casilleros disponibles
                                </Typography>
                            </>
                        )}
                    </Box>

                    {config?.login?.QRPath && (
                        <Box
                            sx={{
                                position: "fixed",
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
                                    "px"
                                ),
                                zIndex: 1000, // 👈 menor que el modal (1300), quedará atrás
                                pointerEvents: "none", // 👈 evita bloquear clics en otros elementos
                            }}
                        >
                            <img
                                src={config.login.QRPath}
                                alt="QR"
                                style={{
                                    width: "auto",
                                    height: "100%",
                                    objectFit: "contain",
                                }}
                            />
                        </Box>
                    )}
                </Box>
            </Box >

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
                disableEnforceFocus
                disableAutoFocus
                disableRestoreFocus
            />

            {loading && (<Loading />)}

        </>
    );
}