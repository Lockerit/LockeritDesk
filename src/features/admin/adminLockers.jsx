import React, { useEffect, useState } from 'react';
import LoadingScreen from '../dialogs/loading.jsx';
import GetAllStatusLockers from '../apis/getAllStatusLockers.js';
import OpenByCodeLocker from '../apis/openByCodeLocker.js';
import { useElectronConfig } from '../hooks/useConfig.js';
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import SetStatusLocker from '../apis/setStatusLocker.js';
import SnackBarAlert from '../bar/snackAlert.jsx';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
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
import { Sync } from '@mui/icons-material';

const fileName = 'adminLockers';

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
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1;

    const config = useElectronConfig();

    useEffect(() => {
        if (!config) return;

        if (config?.params?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.params?.modalTimeouts?.timeoutShowMessage);
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

            if (locker.status.toLowerCase() !== 'ocupado') {
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

    return (
        <>
            <Box
                sx={{
                    height: '87vh', // Ajusta según la altura del AppBar
                    display: 'flex',
                    flexDirection: 'column',
                    px: 4 * scale,
                    py: 2 * scale,
                    width: '100%',
                    alignItems: 'center'
                }}>
                <Box textAlign="center" sx={{ mt: 5 * scale, display: 'flex', alignItems: 'center', flexDirection: 'column', height: '10%' }}>
                    <Typography variant="h3"
                        sx={{ fontWeight: 'bold', mb: 2 * scale }}
                    >
                        Estado de Casilleros
                    </Typography>
                    <Typography
                        variant="h4"
                        component="span"
                        onClick={handleCantidadClick}
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            '&:hover': {
                                textDecoration: 'underline',
                            }
                        }}
                    >
                        {'Cantidad: '} {totalLockers}
                        <Sync sx={{ fontSize: 40 * scale, ml: 1 * scale }} />
                    </Typography>
                </Box>
                {/* Datos generales */}


                {/* Indicadores */}
                <Box textAlign="center" sx={{ mt: 5 * scale, mb: 2 * scale, display: 'flex', justifyContent: 'space-between', height: '5%', width: '100%' }}>
                    {data?.general?.map((item, idx) => (
                        <Box key={item.status}>
                            <Typography variant="h4" component="span"
                                sx={{
                                    fontWeight: 'bold',
                                    color: getColorByStatus(item.status.toUpperCase())
                                }}>
                                {item.status.toUpperCase()}{': '}
                            </Typography>
                            <Typography variant="h4" component="span"
                                sx={{
                                    fontWeight: 'bold',
                                    color: getColorByStatus(item.status.toUpperCase())
                                }}>
                                {item.total}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%', mt: 2 * scale }}>
                    <FormControl variant="standard" sx={{ width: '80%', mr: 5 * scale }}>
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
                                            fontSize: `${45 * scale}px` // Aquí sí afecta el tamaño del ícono
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
                            sx={{ '& .MuiFormControlLabel-label': { fontSize: `${24 * scale}px` } }}
                        />
                    )}
                </Stack>


                {/* Botones de lockers */}
                {currentModule && (
                    <Box sx={{
                        height: '70%',
                        width: '100%',
                        overflowY: 'auto',
                        scrollBehavior: 'smooth',
                        pr: 2 * scale,
                        mt: 2 * scale,
                        p: 2 * scale,
                        boxSizing: 'border-box',
                    }} >
                        <Grid container spacing={1} justifyContent="center" sx={{ minHeight: '100%', width: '100%' }}>
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
                    <Box sx={{
                        height: '15%', width: '100%'
                    }} >
                        {/* Acciones */}
                        {selectedLockers.length > 0 && (
                            <Stack spacing={2} alignItems="center" sx={{ mt: 2 * scale, height: '100%', width: '100%' }}>
                                <Box
                                    sx={{
                                        maxHeight: Math.max(60, Math.min(120, 80 * scale)),   // escala, mínimo 60px, máximo 120px
                                        minHeight: Math.max(32, Math.min(60, 40 * scale)),    // escala, mínimo 32px, máximo 60px
                                        overflowY: 'auto',
                                        width: '100%',
                                        px: 2 * scale,     // padding horizontal proporcional
                                        py: 1 * scale,     // padding vertical proporcional
                                        borderRadius: 2 * scale, // bordes redondeados proporcionales
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1 * scale,    // espacio entre elementos proporcional
                                    }}
                                >
                                    {selectedLockers.map((l) => (
                                        <Chip key={l.lockerCode} label={l.lockerCode} />
                                    ))}
                                </Box>
                                <Stack direction="row" spacing={1} sx={{ width: '100%', maxHeight: '100%' }}>
                                    <Button variant="outlined" color="primary" fullWidth onClick={() => handleAction('abrir')}>
                                        Abrir
                                    </Button>
                                    <Button variant="outlined" color="secondary" fullWidth onClick={() => handleAction('liberar')}>
                                        Liberar
                                    </Button>
                                    <Button variant="outlined" color="warning" fullWidth onClick={handleMenuClick}>
                                        Cambiar estado
                                    </Button>
                                    <Menu
                                        anchorEl={anchorEl}
                                        open={menuOpen}
                                        onClose={handleMenuClose}
                                    >
                                        {data.general
                                            .filter(item => item.status !== 'ocupado') // excluye los que son "ocupado"
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
        </>
    );
};

export default AdminLockers;
