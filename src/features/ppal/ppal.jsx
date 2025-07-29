import { useState, useEffect } from 'react';
import DenseAppBar from '../bar/appbar.jsx';
import KeyPadModal from '../dialogs/keypad.jsx'
import { useUser } from '../context/userContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useElectronConfig } from '../hooks/useConfig.js';
import GetStatusLockers from '../apis/statusLockers.js';
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import LoadingScreen from '../dialogs/loading.jsx';
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
    const [availableLockers, setAvailableLockers] = useState();
    const [unavailableLockers, setUnavailableLockers] = useState();

    const navigate = useNavigate();
    const config = useElectronConfig();

    useEffect(() => {

        if (!config) return;

        fetchDataStatusLocker();
        calculateLockerAvailables();
    }, [config, available]);

    useEffect(() => {
        if (!userInit || !config) return;

        const { authenticated, closeSession, remember, user } = userInit;

        if (!authenticated) {
            navigate('/', { replace: true });
        }

        if (config?.params?.modalTimeouts?.timeoutKeypad) {
            setTimeoutKeypad(config?.params?.modalTimeouts?.timeoutKeypad);
        }
    }, [config, userInit, navigate]);

    useEffect(() => {
        if (!config) return;

        if (config?.params?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.params?.modalTimeouts?.timeoutShowMessage);
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
                fontSize: 72,
                padding: 2,
                width: '100%',
                height: '100%',
                borderRadius: '24px',
                boxShadow: '0 18px 12px rgba(0,0,0,1)',
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
            const result = await GetStatusLockers();

            if (result.success) {
                if (Array.isArray(result?.data?.general)) {
                    const libre = result?.data?.general.find(item => item.status.toLowerCase() === "libre");
                    setAvailable(libre?.total || 0);
                }
                setShowErrorAPIOpen(false);
            } else {
                const msg = typeof result?.data === 'string'
                    ? result.data
                    : result?.data?.message || `[${fileName}] Error al obtener casilleros`;

                setMessageErrorAPI(msg);
                setShowErrorAPIOpen(true);
            }

        } catch (err) {
            setMessageErrorAPI(err.message || `[${fileName}] Error inesperado al obtener casilleros`);
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

    const calculateLockerAvailables = () => {

        setAvailableLockers(Number.isFinite(config?.totalLockers) && Number.isFinite(available)
            ? available
            : 0);

        setUnavailableLockers(Number.isFinite(config?.totalLockers) && Number.isFinite(available)
            ? config.totalLockers - available
            : 0);

        setDisabledButton(available === 0 ? true : false);
    }

    return (
        <>
            {/* <Box sx={{ mb: 5 }}>
                <DenseAppBar />
            </Box> */}

            <Box
                sx={{
                    height: '80vh', // Ajusta según la altura del AppBar
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    px: 4,
                    py: 2,
                    width: '100%',
                    alignItems: 'center'
                }}
            >
                <Box>
                    {config?.login?.logoPath && (<img
                        src={config.login.logoPath}
                        alt="Título"
                        style={{ height: 200 }}
                    />
                    )}
                </Box>

                {/* Botones */}
                <Grid container spacing={2} sx={{ minHeight: '60%', width: '60%' }}>
                    <Grid size={6}>
                        <ActionButton
                            text="Guardar"
                            icon={<AddCircle sx={{ fontSize: 100, mb: 0.5 }} />}
                            color="primary"
                            onClick={saveLocker}
                            disabled={disabledButton}
                        />
                    </Grid>
                    <Grid size={6}>
                        <ActionButton
                            text="Retirar"
                            icon={<RemoveCircle sx={{ fontSize: 100, mb: 0.5 }} />}
                            color="secondary"
                            onClick={removeLocker}
                        />
                    </Grid>

                    <KeyPadModal
                        open={modalOpen}
                        onClose={closeKeypad}
                        operation={operation}
                        timeout={timeoutKeypad}
                    />

                </Grid>

                {/* Indicadores */}
                <Box textAlign="center" sx={{ mt: 8, display: 'flex', justifyContent: 'space-between', gap: 5 }}>
                    <Box>
                        <Typography variant="h4" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                            Casilleros disponibles:{' '}
                        </Typography>
                        <Typography variant="h3" component="span" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                            {availableLockers}
                        </Typography>
                    </Box>
                    <Typography variant="h3" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                        |
                    </Typography>
                    <Box>
                        <Typography variant="h4" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                            Casilleros ocupados:{' '}
                        </Typography>
                        <Typography variant="h3" component="span" color="error" sx={{ fontWeight: 'bold' }}>
                            {unavailableLockers}
                        </Typography>
                    </Box>
                </Box>

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

            </Box>
        </>
    );
}