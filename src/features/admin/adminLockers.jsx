import React, { useEffect, useState } from 'react';
import LoadingScreen from '../dialogs/loading.jsx';
import GetStatusLockers from '../apis/statusLockers.js';
import { useElectronConfig } from '../hooks/useConfig.js';
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import OpenLocker from '../apis/openLocker.js';
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
    Menu
} from '@mui/material';
import { Sync } from '@mui/icons-material';

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
            const result = await GetStatusLockers(); // Reemplaza por tu axios.get()
            if (result?.success) {
                setData(result?.default || result?.data);
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
    };

    const handleModuleChange = (event) => {
        setSelectedModule(event.target.value);
        setSelectedLockers([]); // Reinicia selección
    };

    const handleLockerClick = (lockerCode) => {
        setSelectedLockers((prev) =>
            prev.includes(lockerCode)
                ? prev.filter((code) => code !== lockerCode)
                : [...prev, lockerCode]
        );
    };

    const handleAction = async (action) => {


        setMessageLoading('Buscando Casilllero...');
        setSecondsLeft(timeout);
        const payload = { phone, password }

        try {
            setLoading(true);

            const result = await OpenLocker(payload);

            if (result?.success) {
                console.log();
                setLocker(result.data.lockerCode); // ejemplo
                setAssignLockerOpen(true);
            } else {
                setMessageErrorAPI(result?.data?.message || '[keypad] Error en el servidor HTTP');
                setShowErrorAPIOpen(true);
            }

            setLoading(false);

        } catch (error) {
            setMessageErrorAPI(error);
            setShowErrorAPIOpen(true);
            setLoading(false);
        } finally {
            setLoading(false);
        }

        console.log(`Acción: ${action}`, selectedLockers);
        alert(`Acción "${action}" realizada sobre: ${selectedLockers.join(', ')}`);
    };

    if (loading) return <LoadingScreen />;

    const totalLockers = data?.general?.reduce((sum, item) => sum + item.total, 0);

    const currentModule = data?.modules.find((mod) => mod.module === selectedModule);

    const confirmShowErrorAPI = () => {
        setShowErrorAPIOpen(false);
    };

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleStatusChange = (status) => {
        console.log(`Cambiar estado a: ${status} sobre ${selectedLockers.join(', ')}`);
        handleMenuClose();
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
                    px: 4,
                    py: 2,
                    width: '100%',
                    alignItems: 'center'
                }}>
                <Box textAlign="center" sx={{ mt: 5, display: 'flex', flexDirection: 'column', height: '10%', width: '100%' }}>
                    {/* Título centrado */}
                    <Typography variant="h4"
                        sx={{ fontWeight: 'bold', mb: 2 }}
                    >
                        Estado de Casilleros
                    </Typography>
                    <Typography variant="h5" component="span" color="text.primary" sx={{ fontWeight: 'bold' }}>
                        {'Cantidad: '} {totalLockers}
                    </Typography>
                </Box>
                {/* Datos generales */}


                {/* Indicadores */}
                <Box textAlign="center" sx={{ my: 5, display: 'flex', justifyContent: 'space-between', height: '5%', width: '100%' }}>
                    {data.general.map((item, idx) => (
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

                {/* Select de módulos */}
                <FormControl variant="standard" fullWidth sx={{ height: '5%', width: '100%' }}>
                    <InputLabel id="select-module-label">Selecciona un módulo</InputLabel>
                    <Select
                        labelId="select-module-label"
                        value={selectedModule}
                        label="Selecciona un módulo"
                        onChange={handleModuleChange}
                    >
                        {data.modules.map((mod) => (
                            <MenuItem key={mod.module} value={mod.module}>
                                Módulo {mod.module}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Botones de lockers */}
                {currentModule && (
                    <Box sx={{
                        height: '75%',
                        width: '100%',
                        overflowY: 'auto',
                        scrollBehavior: 'smooth',
                        pr: 2,
                        mt: 5,
                        p: 5,
                        boxSizing: 'border-box',
                    }} >
                        <Grid container spacing={1} justifyContent="center" sx={{ minHeight: '100%', width: '100%' }}>
                            {currentModule.lockers.map((locker) => {
                                const selected = selectedLockers.includes(locker.lockerCode);
                                return (
                                    <Grid size={3} key={locker.lockerCode} sx={{ maxHeight: '100%', display: 'flex', alignItems: 'stretch' }}>
                                        <Button
                                            variant="contained"
                                            onClick={() => handleLockerClick(locker.lockerCode)}
                                            sx={{
                                                backgroundColor: getColorByStatus(locker.status),
                                                border: selected ? '5px solid black' : 'none',
                                                color: '#fff',
                                                width: '100%',
                                                height: '100%',
                                                fontSize: '32px'
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
                        height: '10%', width: '100%'
                    }} >
                        {/* Acciones */}
                        {selectedLockers.length > 0 && (
                            <Stack spacing={2} alignItems="center" sx={{ mt: 2, height: '40%', width: '100%' }}>
                                <Typography variant='h5'>
                                    <strong>Seleccionados:</strong> {selectedLockers.join(', ')}
                                </Typography>
                                <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
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
                                        {data.general.map((item) => (
                                            <MenuItem
                                                key={item.status}
                                                onClick={() => handleStatusChange(item.status)}
                                                sx={{
                                                    color: getColorByStatus(item.status),
                                                    fontWeight: 'bold',
                                                    fontSize: '16px'
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
        </>
    );
};

export default AdminLockers;
