import { useState, useEffect } from 'react';
import DenseAppBar from '../bar/appbar.jsx';
import KeyPadModal from '../dialogs/keypad.jsx'
import { useUser } from '../context/userContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useElectronConfig } from '../hooks/useConfig.js';
import GetAllStatusLockers from '../apis/getAllStatusLockers.js';
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import LoadingScreen from '../dialogs/loading.jsx';
import { useWindowSizeContext } from '../context/windowSizeContext'; // Hook para tamaño pantalla
import { scaledDimension } from '../utils/scaledDimension.js';
import {
    Typography,
    Box,
    Grid,
    Button,
} from '@mui/material';
import {
    AddCircle,
    RemoveCircle
} from '@mui/icons-material';

const fileName = 'ppal';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export default function Ppal() {

    const [modalOpen, setModalOpen] = useState(false);
    const [operation, setOperation] = useState(null);
    const { userInit, setUserInit } = useUser();
    const [available, setAvailable] = useState(null);
    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);
    const [timeoutKeypad, setTimeoutKeypad] = useState();
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const [disabledButton, setDisabledButton] = useState(false);
    // const [availableLockers, setAvailableLockers] = useState();
    // const [unavailableLockers, setUnavailableLockers] = useState();
    const size = useWindowSizeContext();

    log('info', `size ${JSON.stringify(size)}`)

    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    const navigate = useNavigate();
    const config = useElectronConfig();

    useEffect(() => {

        if (!config) return;

        fetchDataStatusLocker();
        setDisabledButton(available === 0 ? true : false);
        // calculateLockerAvailables();
    }, [config, available]);

    useEffect(() => {
        if (!userInit || !config) return;

        const { authenticated, closeSession, remember, user } = userInit;

        if (!authenticated) {
            navigate('/', { replace: true });
        }

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutKeypad(config?.paramsHtml?.modalTimeouts?.timeoutKeypad);
        }
    }, [config, userInit, navigate]);

    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
        }

    }, [config]);

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
                fontSize: 72 * scale,
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
        setShowErrorAPIOpen(false);
    };

    const fetchDataStatusLocker = async () => {
        setLoading(true);
        try {
            const result = await GetAllStatusLockers();

            if (result.success) {
                if (Array.isArray(result?.data?.general)) {
                    const libre = result?.data?.general.find(item => item.status.toLowerCase() === "libre");
                    setAvailable(libre?.total || 0);
                }
                setShowErrorAPIOpen(false);
            } else {
                const msg = typeof result?.data === 'string'
                    ? result.data
                    : 'No se puedo obtener estado de casilleros';

                setMessageErrorAPI(msg);
                setShowErrorAPIOpen(true);
            }

        } catch (err) {
            setMessageErrorAPI('No se puedo obtener estado de casilleros');
            setShowErrorAPIOpen(true);
        } finally {
            setLoading(false);
        }
        setLoading(false);
    };

    const saveLocker = () => {
        setOperation('Guardar');
        setModalOpen(true);
    }

    const removeLocker = () => {
        setOperation('Retirar');
        setModalOpen(true);
    }

    const closeKeypad = () => {
        setModalOpen(false);
        fetchDataStatusLocker();
    }

    // const calculateLockerAvailables = () => {

    //     setAvailableLockers(Number.isFinite(config?.totalLockers) && Number.isFinite(available)
    //         ? available
    //         : 0);

    //     setUnavailableLockers(Number.isFinite(config?.totalLockers) && Number.isFinite(available)
    //         ? config.totalLockers - available
    //         : 0);

    //     setDisabledButton(available === 0 ? true : false);
    // }

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
                        style={{ height: 200 * scale }}
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
                    <Grid size={6}>
                        <ActionButton
                            text="Retirar"
                            icon={<RemoveCircle sx={{ fontSize: 100 * scale, mb: 0.5 * scale }} />}
                            color="secondary"
                            onClick={removeLocker}
                        />
                    </Grid>

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
                                <Typography variant="h2" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                                    Casilleros disponibles:{' '}
                                </Typography>
                                <Typography variant="h2" component="span" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                                    {available || 0}
                                </Typography>
                            </>
                        )}
                        {disabledButton && (
                            <>
                                <Typography variant="h2" component="span" color="error" sx={{ fontWeight: 'bold' }}>
                                    No hay casilleros disponibles
                                </Typography>
                            </>
                        )}
                    </Box>

                    {/* Imagen (alineada completamente a la derecha) */}
                    {config?.login?.QRPath && (
                        <Box
                            sx={{
                                ml: 'auto',
                                mt: 2 * scale,
                                height: scaledDimension(
                                    {
                                        xs: { base: 140, min: 135, max: 145 }, // en % para mobile
                                        sm: { base: 140, min: 135, max: 145 }, // tablet
                                        md: { base: 160, min: 155, max: 165 }, // desktop medio
                                        lg: { base: 180, min: 175, max: 185 }, // desktop grande
                                    },
                                    scale,
                                    "px"
                                ),
                            }}>
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
            </Box >

            <KeyPadModal
                open={modalOpen}
                onClose={closeKeypad}
                operation={operation}
                timeout={timeoutKeypad}
            />

            <ShowErrorAPI
                open={showErrorAPIOpen}
                onConfirm={confirmShowErrorAPI}
                msg={messageErrorAPI}
                timeout={timeoutShowMessage}
                disableEnforceFocus
                disableAutoFocus
                disableRestoreFocus
            />

            {loading && (<LoadingScreen />)}

        </>
    );
}