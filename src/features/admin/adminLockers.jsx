import React, { useEffect, useState } from 'react';
import LoadingScreen from '../dialogs/loading.jsx';
import GetAllStatusLockers from '../apis/getAllStatusLockers.js';
import OpenByCodeLocker from '../apis/openByCodeLocker.js';
import { useElectronConfig } from '../hooks/useConfig.js';
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import SetStatusLocker from '../apis/setStatusLocker.js';
import SnackBarAlert from '../bar/snackAlert.jsx';
import { useWindowSizeContext } from '../context/windowSizeContext'; // Hook para tamaño pantalla
import RegisterUserPeriod from '../dialogs/registerUserPeriod.jsx';
import { useModal } from "../context/modalContext.jsx";
import {
    Box,
    Typography,
    Grid,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Button,
    Paper,
    Stack,
    Menu,
    Checkbox,
    FormControlLabel,
    Chip
} from '@mui/material';
import { Payment, Sync } from '@mui/icons-material';

const fileName = 'adminLockers';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

const AdminLockers = () => {
    const [data, setData] = useState(null);
    const [selectedModule, setSelectedModule] = useState('');
    const [selectedLockers, setSelectedLockers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const [anchorEl, setAnchorEl] = useState(null);
    const menuOpen = Boolean(anchorEl);
    const [messageLoading, setMessageLoading] = useState();
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [timeoutKeypad, setTimeoutKeypad] = useState();
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const config = useElectronConfig();

    const {
        registerUserPeriodOpen, setRegisterUserPeriodOpen,
    } = useModal();

    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
        }

    }, [config]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setMessageLoading('Cargando...');
        setLoading(true);
        try {
            const result = await GetAllStatusLockers();
            if (result?.success) {
                setData(result?.default || result?.data);
            } else {
                const msg = typeof result?.data === 'string'
                    ? result.data
                    : result?.data?.message || 'Error al obtener casilleros';

                setMessageErrorAPI(msg);
                setShowErrorAPIOpen(true);
            }

        } catch (err) {
            setMessageErrorAPI(err.message || 'Error inesperado al obtener casilleros');
            setShowErrorAPIOpen(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModuleChange = (event) => {
        setSelectedModule(event.target.value);
        setSelectedLockers([]); // Reinicia selección
    };

    const handleLockerClick = (locker) => {
        const exists = selectedLockers.some(
            (item) => item.lockerCode === locker.lockerCode
        );

        if (exists) {
            setSelectedLockers((prev) =>
                prev.filter((item) => item.lockerCode !== locker.lockerCode)
            );
        } else {
            setSelectedLockers((prev) => [...prev, { lockerCode: locker.lockerCode, status: locker.status }]);
        }
    };


    const handleAction = async (action) => {

        if (action.toLowerCase() === 'reservar') {
            setSelectedLockers([]); // Deseleccionar todos
            setRegisterUserPeriodOpen(true);
            return;

        }

        let setFree = null;

        if (action === 'abrir') {
            setMessageLoading('Abriendo...');
            setFree = false;
        } else if (action === 'liberar') {
            setMessageLoading('Liberando...');
            setFree = true;
        }

        setLoading(true);
        const successfulLockers = [];
        const failedLockers = [];
        const openBy = 'local';

        for (const { lockerCode } of selectedLockers) {
            try {
                const payloadOpen = {
                    lockerCode,
                    setFree,
                    openBy
                };

                const resultOpen = await OpenByCodeLocker(payloadOpen);

                if (resultOpen?.success) {
                    successfulLockers.push(lockerCode);
                } else {
                    failedLockers.push(lockerCode);
                }
            } catch (err) {
                failedLockers.push(lockerCode);
            }
        }
        setLoading(false);

        if (failedLockers.length > 0) {
            if (failedLockers.length > 1) {
                setMessageErrorAPI(`Los casilleros (${failedLockers.join(', ')}) no se abrieron`);
            }
            else {
                setMessageErrorAPI(`El casillero (${failedLockers.join(', ')}) no se abrió`);
            }
            setShowErrorAPIOpen(true);
        }

        if (successfulLockers.length > 0) {
            setTimeout(() => {
                if (successfulLockers.length > 1) {
                    showAlert(`Los casilleros (${successfulLockers.join(', ')}) se abrieron exitosamente`, 'info');
                } else {
                    showAlert(`El casillero (${successfulLockers.join(', ')}) se abrió exitosamente`, 'info');
                }
            }, 500); // Espera 1s después del modal
        }

        await fetchData();
        setSelectedLockers([]); // Deseleccionar todos
    };

    const showAlert = (msg, severity = 'error') => {
        setSnackbarMessage(msg);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    // if (loading) return <LoadingScreen />;

    const totalLockers = data?.general?.reduce((sum, item) => sum + item.total, 0);

    const currentModule = data?.modules?.find((mod) => mod.module === selectedModule);

    const confirmShowErrorAPI = () => {
        setShowErrorAPIOpen(false);
    };

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleCantidadClick = () => {
        fetchData();
    }

    const handleStatusChange = async (status) => {

        setMessageLoading('Cambiando estado...');
        setLoading(true);

        const successfulLockers = [];
        const failedLockers = [];

        for (const locker of selectedLockers) {

            if (locker.status.toLowerCase() !== 'ocupado' && locker.status.toLowerCase() !== 'reservado') {
                try {
                    const payloadSetStatus = {
                        lockerCode: locker.lockerCode,
                        newStatus: status
                    };

                    const resultStatus = await SetStatusLocker(payloadSetStatus);

                    if (resultStatus?.success) {
                        successfulLockers.push(locker.lockerCode);
                    } else {
                        failedLockers.push(locker.lockerCode);
                    }
                } catch (err) {
                    failedLockers.push(locker.lockerCode);
                }
            } else {
                failedLockers.push(locker.lockerCode);
            }
        }

        setLoading(false);

        if (failedLockers.length > 0) {
            if (failedLockers.length > 1) {
                setMessageErrorAPI(`Los casilleros (${failedLockers.join(', ')}) no cambiaron de estado`);
            } else {
                setMessageErrorAPI(`El casillero (${failedLockers.join(', ')}) no cambió de estado`);
            }
            setShowErrorAPIOpen(true);
        }

        if (successfulLockers.length > 0) {
            setTimeout(() => {
                if (successfulLockers.length > 1) {
                    showAlert(`Los casilleros (${successfulLockers.join(', ')}) cambiaron de estado exitosamente`, 'info');
                } else {
                    showAlert(`El casillero (${successfulLockers.join(', ')}) cambió de estado exitosamente`, 'info');
                }
            }, 1000); // Espera 1s después del modal
        }

        await fetchData();
        setSelectedLockers([]); // Deseleccionar todos
        handleMenuClose();
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            // Selecciona todos los lockers visibles en el módulo actual
            const allLockers = currentModule.lockers.map(locker => ({
                lockerCode: locker.lockerCode,
                status: locker.status
            }));
            setSelectedLockers(allLockers);
        } else {
            // Deselecciona todos
            setSelectedLockers([]);
        }
    };

    // Colores por estado
    const getColorByStatus = (status) => {
        switch (status.toLowerCase()) {
            case 'libre':
                return 'text.secondary';
            case 'ocupado':
                return 'error.main';
            case 'reservado':
                return 'text.primary';
            case 'deshabilitado':
                return '#757575'
            default:
                return '#757575'
        }
    };

    const closeKeypad = () => {
        setRegisterUserPeriodOpen(false);
    };

    return (
        <>
            <Box
                sx={{
                    height: "100%",           // ocupa todo el espacio disponible
                    display: "flex",
                    flexDirection: "column",
                    px: 4 * scale,
                    width: "100%",
                    alignItems: "center",
                    boxSizing: "border-box",
                }}
            >
                <Box textAlign="center"
                    sx={{
                        flex: "0 0 7%",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                >
                    {/* <Typography variant="h4"
                        sx={{ fontWeight: 'bold', mb: 2 * scale }}
                    >
                        Estado de Casilleros
                    </Typography> */}
                    <Typography
                        variant="h4"
                        component="span"
                        onClick={handleCantidadClick}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            pb: 5 * scale,
                            '&:hover': {
                                color: 'primary.main',
                            }
                        }}
                    >
                        {'Cantidad: '} {totalLockers}
                        <Sync sx={{ fontSize: 32 * scale, ml: 1 * scale }} />
                    </Typography>
                </Box>
                {/* Datos generales */}


                {/* Indicadores */}
                <Box textAlign="center"
                    sx={{
                        flex: "0 0 5%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                    }}
                >
                    {data?.general?.map((item, idx) => (
                        <Box key={item.status} sx={{ pb: 5 * scale }}>
                            <Typography variant="h5" component="span"
                                sx={{
                                    fontWeight: 'bold',
                                    color: getColorByStatus(item.status.toUpperCase())
                                }}>
                                {item.status.toUpperCase()}{': '}
                            </Typography>
                            <Typography variant="h5" component="span"
                                sx={{
                                    fontWeight: 'bold',
                                    color: getColorByStatus(item.status.toUpperCase())
                                }}>
                                {item.total}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%", flex: "0 0 10%" }}>
                    <FormControl variant="standard" sx={{ width: '75%', mr: 5 * scale }}>
                        <InputLabel id="select-module-label">Selecciona un módulo</InputLabel>
                        <Select
                            labelId="select-module-label"
                            value={selectedModule}
                            label="Selecciona un módulo"
                            onChange={handleModuleChange}
                        >
                            {data?.modules?.map((mod) => (
                                <MenuItem key={mod.module} value={mod.module}>
                                    Módulo {mod.module}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {currentModule && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    sx={{
                                        '& .MuiSvgIcon-root': {
                                            fontSize: `${40 * scale}px`, // Aquí sí afecta el tamaño del ícono
                                        }
                                    }}
                                    checked={
                                        currentModule.lockers.length > 0 &&
                                        selectedLockers.length === currentModule.lockers.length
                                    }
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                />
                            }
                            label="Seleccionar todos"
                            sx={{ '& .MuiFormControlLabel-label': { fontSize: `${30 * scale}px` } }}
                        />
                    )}
                </Stack>


                {/* Botones de lockers */}
                {currentModule && (
                    <Box
                        sx={{
                            flex: 1,               // ocupa el resto de la pantalla
                            width: "100%",
                            overflowY: "auto",     // scroll SOLO aquí
                            scrollBehavior: "smooth",
                            pr: 2 * scale,
                            mt: 2 * scale,
                            p: 2 * scale,
                            boxSizing: "border-box",
                        }}
                    >
                        <Grid container spacing={1 * scale} justifyContent="center" sx={{ minHeight: '100%', width: '100%' }}>
                            {currentModule.lockers.map((locker) => {
                                const selected = selectedLockers.some(
                                    (item) => item.lockerCode === locker.lockerCode
                                );
                                return (
                                    <Grid size={2.4} key={locker.lockerCode} sx={{ maxHeight: '100%', display: 'flex', alignItems: 'stretch' }}>
                                        <Button
                                            variant="contained"
                                            onClick={() => handleLockerClick(locker)}
                                            sx={{
                                                backgroundColor: getColorByStatus(locker.status),
                                                border: selected ? `${5 * scale}px solid black` : 'none',
                                                color: '#fff',
                                                width: '100%',
                                                height: '100%',
                                                fontSize: `${32 * scale}px`
                                                // '&:hover': {
                                                //     backgroundColor: getHoverColorByStatus(locker.status),
                                                //     color: '#fff'
                                                // }
                                            }}
                                        >
                                            {locker.lockerCode}
                                        </Button>
                                    </Grid>
                                );
                            })}
                        </Grid>
                    </Box>
                )}

                {currentModule && (
                    <Box sx={{ flex: "0 0 15%", width: "100%" }}>
                        {/* Acciones */}
                        {selectedLockers.length > 0 && (
                            <Stack spacing={2 * scale} alignItems="center" sx={{ mt: 2 * scale, height: '100%', width: '100%' }}>
                                <Box
                                    sx={{
                                        maxHeight: Math.max(60, Math.min(120, 80 * scale)),   // escala, mínimo 60px, máximo 120px
                                        minHeight: Math.max(32, Math.min(60, 40 * scale)),    // escala, mínimo 32px, máximo 60px
                                        overflowY: 'auto',
                                        width: '100%',
                                        px: 2 * scale,
                                        py: 1 * scale,
                                        borderRadius: 2 * scale,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1 * scale,
                                    }}
                                >
                                    {selectedLockers.map((l) => (
                                        <Chip key={l.lockerCode} label={l.lockerCode} sx={{
                                            height: 48 * scale,
                                            fontSize: 20 * scale,
                                            px: 2 * scale,
                                            borderRadius: 2 * scale,
                                        }} />
                                    ))}
                                </Box>
                                <Stack direction="row" spacing={1 * scale} sx={{ width: '100%', maxHeight: '100%', padding: 2 * scale }}>
                                    <Button variant="outlined" color="primary" fullWidth onClick={() => handleAction('abrir')}>
                                        Abrir
                                    </Button>
                                    <Button variant="outlined" color="warning" fullWidth onClick={() => handleAction('liberar')}>
                                        Liberar
                                    </Button>
                                    <Button variant="outlined" color="error" fullWidth onClick={handleMenuClick}>
                                        Cambiar estado
                                    </Button>
                                    <Menu
                                        anchorEl={anchorEl}
                                        open={menuOpen}
                                        onClose={handleMenuClose}
                                    >
                                        {data.general
                                            .filter(item => {
                                                if (item.status.toLowerCase() === "ocupado" || item.status.toLowerCase() === "reservado") return false; // nunca mostrar "ocupado"
                                                return true; // los demás pasan
                                            })
                                            .map(item => (
                                                <MenuItem
                                                    key={item.status}
                                                    onClick={() => handleStatusChange(item.status)}
                                                    sx={{
                                                        color: getColorByStatus(item.status),
                                                        fontWeight: 'bold',
                                                        fontSize: `${24 * scale}px`
                                                    }}
                                                >
                                                    {item.status}
                                                </MenuItem>
                                            ))}
                                    </Menu>
                                </Stack>
                            </Stack>
                        )}
                    </Box>
                )}

                {config?.reserve?.enabled && (
                    <Box sx={{ mt: "auto", width: '100%' }}>
                        <Button
                            variant="outlined"
                            color="secondary"
                            fullWidth
                            onClick={() => handleAction("reservar")}
                        >
                            Reservar
                        </Button>
                    </Box>
                )}
            </Box>
            {loading && (<LoadingScreen
                message={messageLoading}
            />)}

            <ShowErrorAPI
                open={showErrorAPIOpen}
                onConfirm={confirmShowErrorAPI}
                msg={messageErrorAPI}
                timeout={timeoutShowMessage}
                disableEnforceFocus
                disableAutoFocus
                disableRestoreFocus
            />

            <SnackBarAlert
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
            />

            <RegisterUserPeriod
                open={registerUserPeriodOpen}
                onClose={closeKeypad}
                timeout={timeoutKeypad}
            />
        </>
    );
};

export default AdminLockers;
