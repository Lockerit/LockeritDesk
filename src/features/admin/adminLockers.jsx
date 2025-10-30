import { Sync } from '@mui/icons-material';
import { Box, Button, Checkbox, Chip, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, Stack, Typography, Menu } from '@mui/material';
import { useEffect, useState } from 'react';

import { GetAllStatusLockers } from '@services/apis/getAllStatusLockers.js';
import { OpenByCodeLocker } from '@services/apis/openByCodeLocker.js';
import { SetStatusLocker } from '@services/apis/setStatusLocker.js';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { RegisterUserPeriod } from '@shared/components/dialogs/RegisterUserPeriod.jsx';
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { useModal } from "@shared/context/ModalContext.jsx";
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';

const fileName = 'AdminLockers';
const log = logger.scope(fileName);

export const AdminLockers = () => {
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
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const [dataStatus] = useState({
        general: [
            { status: "Libre", color: "success.main" },
            { status: "Ocupado", color: "error.main" },
            { status: "Reservado", color: "info.main" },
            { status: "Deshabilitado", color: "gray" },
            { status: "Asignado", color: "purple" },
        ],
    });

    const config = useElectronConfig();

    const {
        registerUserPeriodOpen, setRegisterUserPeriodOpen,
    } = useModal();

    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
        }

        log.info('Config cargada para AdminLockers');

    }, [config]);

    useEffect(() => {
        log.info('Montando vista, solicitando estado de casilleros');
        fetchData();
    }, []);

    const fetchData = async () => {
        setMessageLoading('Cargando...');
        setLoading(true);
        try {
            log.info('GET /getAllStatusLockers → inicio');
            const result = await GetAllStatusLockers();
            if (result?.success) {
                setData(result?.default || result?.data);
                setSelectedModule((result?.data?.modules?.[0]?.module) || '');
                const total = (result?.data?.general || []).reduce((s, i) => s + (i.total || 0), 0);
                log.info(`GET /getAllStatusLockers → ok, total=${total}, modules=${(result?.data?.modules || []).length}`);
            } else {
                const msg = typeof result?.data === 'string'
                    ? result.data
                    : result?.data?.message || 'Error al obtener casilleros';

                setMessageErrorAPI(msg);
                setShowErrorAPIOpen(true);

                log.error(`GET /getAllStatusLockers → fail: ${msg}`);
            }

        } catch (_err) {
            setMessageErrorAPI(_err.message || 'Error inesperado al obtener casilleros');
            setShowErrorAPIOpen(true);
            log.error(`GET /getAllStatusLockers → exception: ${_err.message || _err}`);
        } finally {
            setLoading(false);
            log.info('GET /getAllStatusLockers → fin');
        }
    };

    const handleModuleChange = (event) => {
        setSelectedModule(event.target.value);
        setSelectedLockers([]); // Reinicia selección
        log.info(`Módulo seleccionado: ${event.target.value}`);
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

        const nextCount = exists ? selectedLockers.length - 1 : selectedLockers.length + 1;
        log.info(`Toggle locker=${locker.lockerCode} status=${locker.status} → seleccionados=${nextCount}`);
    };


    const handleAction = async (action) => {

        log.info(`Acción solicitada: ${action} → seleccionados=[${selectedLockers.map(l => l.lockerCode).join(',')}]`);

        if (action.toLowerCase() === 'reservar') {
            setSelectedLockers([]); // Deseleccionar todos
            setRegisterUserPeriodOpen(true);
            log.info('Abrir modal de reserva (RegisterUserPeriod)');
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

        for (const locker of selectedLockers) {
            // if (locker.status.toLowerCase() !== 'reservado' ) {
            try {
                const payloadOpen = {
                    lockerCode: locker.lockerCode,
                    setFree,
                    openBy
                };

                log.info(`POST /openByCode locker=${locker.lockerCode} setFree=${setFree}`);
                const resultOpen = await OpenByCodeLocker(payloadOpen);

                if (resultOpen?.success) {
                    successfulLockers.push(locker.lockerCode);
                    log.info(`POST /openByCode OK locker=${locker.lockerCode}`);
                } else {
                    failedLockers.push(locker.lockerCode);
                    log.error(`POST /openByCode FAIL locker=${locker.lockerCode}`);
                }
            } catch (_err) {
                log.error(`Error al ${action} casillero ${locker.lockerCode}: ${_err.message || _err}`);
                failedLockers.push(locker.lockerCode);
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

        log.info(`Acción ${action} → ok=[${successfulLockers.join(',')}] fail=[${failedLockers.join(',')}]`);

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
        log.info('Cerrar modal de error API');
    };

    const handleMenuClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleCantidadClick = () => {
        fetchData();
        log.info('Refrescar cantidades (click en header)');
    }

    const handleStatusChange = async (status) => {

        log.info(`Cambiar estado → nuevo=${status} seleccionados=[${selectedLockers.map(l => l.lockerCode).join(',')}]`);

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

                    log.info(`POST /setStatus locker=${locker.lockerCode} → ${status}`);
                    const resultStatus = await SetStatusLocker(payloadSetStatus);

                    if (resultStatus?.success) {
                        successfulLockers.push(locker.lockerCode);
                        log.info(`POST /setStatus OK locker=${locker.lockerCode}`);
                    } else {
                        failedLockers.push(locker.lockerCode);
                        log.error(`POST /setStatus FAIL locker=${locker.lockerCode}`);
                    }
                } catch (_err) {
                    log.error(`Error al cambiar estado del casillero ${locker.lockerCode}: ${_err.message || _err}`);
                    failedLockers.push(locker.lockerCode);
                }
            } else {
                log.error(`No está permitido cambiar el estado del casillero ${locker.lockerCode} porque está ${locker.status}`);
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
        
        log.info(`Cambiar estado → ok=[${successfulLockers.join(',')}] fail=[${failedLockers.join(',')}] nuevo=${status}`);

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
            log.info(`Seleccionar todos → ${allLockers.length} lockers`);
        } else {
            // Deselecciona todos
            setSelectedLockers([]);
            log.info('Deseleccionar todos');
        }
    };

    const closeRegisterUserPeriod = () => {
        setRegisterUserPeriodOpen(false);
        fetchData(); // Refrescar datos al cerrar el modal
        log.info('Cerrar modal de reserva → refrescar listado');
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
                <Box
                    textAlign="center"
                    sx={{
                        flex: "0 0 5%",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                    }}
                >
                    {data?.general?.map((item) => {
                        // Busca el color correspondiente en dataStatus
                        const matchedStatus = dataStatus.general.find(
                            (s) => s.status.toLowerCase() === item.status.toLowerCase()
                        );

                        const color = matchedStatus ? matchedStatus.color : "black"; // color por defecto si no encuentra coincidencia

                        return (
                            <Box key={matchedStatus.status} sx={{ pb: 5 * scale }}>
                                <Typography
                                    variant="h5"
                                    component="span"
                                    sx={{
                                        fontWeight: "bold",
                                        color: color,
                                    }}
                                >
                                    {matchedStatus.status}
                                    {": "}
                                </Typography>
                                <Typography
                                    variant="h5"
                                    component="span"
                                    sx={{
                                        fontWeight: "bold",
                                        color: color,
                                    }}
                                >
                                    {item.total}
                                </Typography>
                            </Box>
                        );
                    })}
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
                        <Grid
                            container
                            spacing={1 * scale}
                            justifyContent="center"
                            sx={{ minHeight: "100%", width: "100%" }}
                        >
                            {currentModule.lockers.map((locker) => {
                                const selected = selectedLockers.some(
                                    (item) => item.lockerCode === locker.lockerCode
                                );

                                // 🔍 Busca el color según el status en dataStatus
                                const matchedStatus = dataStatus.general.find(
                                    (s) => s.status.toLowerCase() === locker.status.toLowerCase()
                                );

                                // Usa el color correspondiente o un fallback
                                const color = matchedStatus ? matchedStatus.color : "gray";

                                return (
                                    <Grid
                                        key={locker.lockerCode}
                                        size={2.4}
                                        sx={{
                                            maxHeight: "100%",
                                            display: "flex",
                                            alignItems: "stretch",
                                        }}
                                    >
                                        <Button
                                            variant="contained"
                                            onClick={() => handleLockerClick(locker)}
                                            sx={{
                                                backgroundColor: color,
                                                border: selected ? `${5 * scale}px solid black` : "none",
                                                color: "#fff",
                                                width: "100%",
                                                height: "100%",
                                                fontSize: `${32 * scale}px`,
                                                "&:hover": {
                                                    backgroundColor: color, // evita cambio al hacer hover
                                                    opacity: 0.85, // leve efecto visual
                                                },
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
                                        {dataStatus.general
                                            .filter(item => {
                                                if (item.status.toLowerCase() === "ocupado" || item.status.toLowerCase() === "reservado") return false; // nunca mostrar "ocupado"
                                                return true; // los demás pasan
                                            })
                                            .map(item => (
                                                <MenuItem
                                                    key={item.status}
                                                    onClick={() => handleStatusChange(item.status.toLocaleLowerCase())}
                                                    sx={{
                                                        color: item.color,
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
            {loading && (<Loading
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

            <SnackAlert
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
            />

            <RegisterUserPeriod
                open={registerUserPeriodOpen}
                onClose={closeRegisterUserPeriod}
            />
        </>
    );
};
