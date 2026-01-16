import { Key, Lock, LockOpen, Sync } from '@mui/icons-material';
import {
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Typography,
    Menu
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { useEffect, useState, useMemo } from 'react';

import { GetAllStatusLockers } from '@services/apis/getAllStatusLockers.js';
import { OpenByCodeLocker } from '@services/apis/openByCodeLocker.js';
import { SetStatusLocker } from '@services/apis/setStatusLocker.js';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { RegisterUserPeriod } from '@shared/components/dialogs/RegisterUserPeriod.jsx';
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { StatusLockersPopper } from '@shared/components/dialogs/StatusLockersPopper.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { useElectronLockersColors } from '@shared/hooks/useLockersColors.js';
import { adminActionButtonSx } from '@shared/theme/buttonSx.js';
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
    const [registerUserPeriodOpen, setRegisterUserPeriodOpen] = useState(false);
    const [dataStatus, setDataStatus] = useState({ general: [] });

    const [statusAnchorEl, setStatusAnchorEl] = useState(null);
    const [statusPopperOpen, setStatusPopperOpen] = useState(false);
    const [statusSelected, setStatusSelected] = useState(null);

    const theme = useTheme();
    const config = useElectronConfig();
    const lockersColors = useElectronLockersColors();


    const allLockers = useMemo(() => {
        return (data?.modules || []).flatMap((m) => (m.lockers || []).map((l) => ({
            lockerCode: l.lockerCode,
            status: l.status,
            module: m.module,
        })));
    }, [data]);

    useEffect(() => {
        if (!lockersColors) return;

        setDataStatus({
            general: lockersColors?.lockersColorsStatus.map(({ status, color }) => ({
                status, // o status: status.toUpperCase() si quieres mayúsculas
                color,
            })),
        });
    }, [lockersColors]);

    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutShowMessage) {
            setTimeoutShowMessage(config.paramsHtml.modalTimeouts.timeoutShowMessage);
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
                const newData = result?.default || result?.data;
                const modules = newData?.modules || [];

                setData(newData);

                // Mantener último módulo si existe; si no, usar el primero
                setSelectedModule((prev) => {
                    if (prev && modules.some((m) => m.module === prev)) {
                        return prev;
                    }
                    return modules[0]?.module || '';
                });

                const total = (newData?.general || []).reduce(
                    (s, i) => s + (i.total || 0),
                    0
                );

                log.info(
                    `GET /getAllStatusLockers → ok, total=${total}, modules=${modules.length}`
                );
            } else {
                const msg =
                    typeof result?.data === 'string'
                        ? result.data
                        : result?.data?.message || 'Error al obtener casilleros';

                setMessageErrorAPI(msg);
                setShowErrorAPIOpen(true);

                log.error(`GET /getAllStatusLockers → fail: ${msg}`);
            }
        } catch (_err) {
            setMessageErrorAPI(
                _err?.message || 'Error inesperado al obtener casilleros'
            );
            setShowErrorAPIOpen(true);
            log.error(
                `GET /getAllStatusLockers → exception: ${_err?.message || _err}`
            );
        } finally {
            setLoading(false);
            log.info('GET /getAllStatusLockers → fin');
        }
    };


    const blurActive = () => {
        try {
            const el = document.activeElement;
            if (el && el instanceof HTMLElement) el.blur();
        } catch (e) {
            log.error(`exception blur: ${e?.message || e}`);
        }
    };

    const handleModuleChange = (event) => {
        setSelectedModule(event.target.value);
        setSelectedLockers([]);
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
            setSelectedLockers((prev) => [
                ...prev,
                { lockerCode: locker.lockerCode, status: locker.status },
            ]);
        }

        const nextCount = exists ? selectedLockers.length - 1 : selectedLockers.length + 1;
        log.info(
            `Toggle locker=${locker.lockerCode} status=${locker.status} → seleccionados=${nextCount}`
        );
    };

    const showAlert = (msg, severity = 'error') => {
        setSnackbarMessage(msg);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const handleAction = async (action) => {
        blurActive();
        log.info(
            `Acción solicitada: ${action} → seleccionados=[${selectedLockers
                .map((l) => l.lockerCode)
                .join(',')}]`
        );

        if (action.toLowerCase() === 'reservar') {
            setSelectedLockers([]);
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
            try {
                const payloadOpen = {
                    lockerCode: locker.lockerCode,
                    setFree,
                    openBy,
                };

                log.info(
                    `POST /openByCode locker=${locker.lockerCode} setFree=${setFree}`
                );
                const resultOpen = await OpenByCodeLocker(payloadOpen);

                if (resultOpen?.success) {
                    successfulLockers.push(locker.lockerCode);
                    log.info(`POST /openByCode OK locker=${locker.lockerCode}`);
                } else {
                    failedLockers.push(locker.lockerCode);
                    log.error(`POST /openByCode FAIL locker=${locker.lockerCode}`);
                }
            } catch (_err) {
                log.error(
                    `Error al ${action} casillero ${locker.lockerCode}: ${_err?.message || _err
                    }`
                );
                failedLockers.push(locker.lockerCode);
            }
        }
        setLoading(false);

        if (failedLockers.length > 0) {
            setMessageErrorAPI(
                failedLockers.length > 1
                    ? `Los casilleros (${failedLockers.join(', ')}) no se abrieron`
                    : `El casillero (${failedLockers.join(', ')}) no se abrió`
            );
            setShowErrorAPIOpen(true);
        }

        if (successfulLockers.length > 0) {
            setTimeout(() => {
                showAlert(
                    successfulLockers.length > 1
                        ? `Los casilleros (${successfulLockers.join(
                            ', '
                        )}) se abrieron exitosamente`
                        : `El casillero (${successfulLockers.join(
                            ', '
                        )}) se abrió exitosamente`,
                    'info'
                );
            }, 500);
        }

        log.info(
            `Acción ${action} → ok=[${successfulLockers.join(
                ','
            )}] fail=[${failedLockers.join(',')}]`
        );

        await fetchData();
        setSelectedLockers([]);
    };

    const totalLockers = data?.general?.reduce(
        (sum, item) => sum + item.total,
        0
    );

    const currentModule = data?.modules?.find(
        (mod) => mod.module === selectedModule
    );

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
    };

    const handleStatusChange = async (status) => {
        blurActive();
        log.info(
            `Cambiar estado → nuevo=${status} seleccionados=[${selectedLockers
                .map((l) => l.lockerCode)
                .join(',')}]`
        );

        setMessageLoading('Cambiando estado...');
        setLoading(true);

        const successfulLockers = [];
        const failedLockers = [];

        for (const locker of selectedLockers) {
            if (
                locker.status.toLowerCase() !== 'ocupado' &&
                locker.status.toLowerCase() !== 'reservado'
            ) {
                try {
                    const payloadSetStatus = {
                        lockerCode: locker.lockerCode,
                        newStatus: status,
                    };

                    log.info(
                        `POST /setStatus locker=${locker.lockerCode} → ${status}`
                    );
                    const resultStatus = await SetStatusLocker(payloadSetStatus);

                    if (resultStatus?.success) {
                        successfulLockers.push(locker.lockerCode);
                        log.info(`POST /setStatus OK locker=${locker.lockerCode}`);
                    } else {
                        failedLockers.push(locker.lockerCode);
                        log.error(`POST /setStatus FAIL locker=${locker.lockerCode}`);
                    }
                } catch (_err) {
                    log.error(
                        `Error al cambiar estado del casillero ${locker.lockerCode}: ${_err?.message || _err
                        }`
                    );
                    failedLockers.push(locker.lockerCode);
                }
            } else {
                log.error(
                    `No está permitido cambiar el estado del casillero ${locker.lockerCode} porque está ${locker.status}`
                );
                failedLockers.push(locker.lockerCode);
            }
        }

        setLoading(false);

        if (failedLockers.length > 0) {
            setMessageErrorAPI(
                failedLockers.length > 1
                    ? `Los casilleros (${failedLockers.join(
                        ', '
                    )}) no cambiaron de estado`
                    : `El casillero (${failedLockers.join(
                        ', '
                    )}) no cambió de estado`
            );
            setShowErrorAPIOpen(true);
        }

        if (successfulLockers.length > 0) {
            setTimeout(() => {
                showAlert(
                    successfulLockers.length > 1
                        ? `Los casilleros (${successfulLockers.join(
                            ', '
                        )}) cambiaron de estado exitosamente`
                        : `El casillero (${successfulLockers.join(
                            ', '
                        )}) cambió de estado exitosamente`,
                    'info'
                );
            }, 1000);
        }

        log.info(
            `Cambiar estado → ok=[${successfulLockers.join(
                ','
            )}] fail=[${failedLockers.join(',')}] nuevo=${status}`
        );

        await fetchData();
        setSelectedLockers([]);
        handleMenuClose();
    };

    const handleSelectAll = (checked) => {
        if (!currentModule) return;

        if (checked) {
            const allLockers = currentModule.lockers.map((locker) => ({
                lockerCode: locker.lockerCode,
                status: locker.status,
            }));
            setSelectedLockers(allLockers);
            log.info(`Seleccionar todos → ${allLockers.length} lockers`);
        } else {
            setSelectedLockers([]);
            log.info('Deseleccionar todos');
        }
    };

    const closeRegisterUserPeriod = () => {
        setRegisterUserPeriodOpen(false);
        fetchData();
        log.info('Cerrar modal de reserva → refrescar listado');
    };

    const handleStatusSummaryClick = (event, status) => {
        setStatusAnchorEl(event.currentTarget);
        setStatusSelected(status);
        setStatusPopperOpen(true);
    };

    const handleCloseStatusPopper = () => {
        setStatusPopperOpen(false);
        setStatusAnchorEl(null);
    };

    return (
        <>
            <Box
                sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    px: { xs: 2, sm: 4, md: 6 },
                    width: '100%',
                    alignItems: 'center',
                    boxSizing: 'border-box',
                    overflow: 'hidden', 
                }}
            >
                {/* Cabecera Cantidad */}
                <Box
                    textAlign="center"
                    sx={{
                        flex: '0 0 7%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
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
                            pb: { xs: 1, sm: 2 },
                            '&:hover': {
                                color: 'primary.main',
                            },
                        }}
                    >
                        {'Cantidad: '} {totalLockers}
                        <Sync
                            sx={{
                                fontSize: { xs: 24, sm: 28, md: 32 },
                                ml: 1,
                            }}
                        />
                    </Typography>
                </Box>

                {/* Indicadores generales */}
                <Box
                    textAlign="center"
                    sx={{
                        flex: '0 0 5%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        width: '100%',
                        flexWrap: 'wrap',
                        rowGap: { xs: 1, sm: 1.5 },
                    }}
                >
                    {data?.general?.map((item) => {
                        const matchedStatus = dataStatus.general.find(
                            (s) => s.status.toLowerCase() === item.status.toLowerCase()
                        );

                        const labelStatus = matchedStatus?.status || item.status;
                        const color = matchedStatus ? matchedStatus.color : 'text.primary';

                        return (
                            <Box
                                key={labelStatus}
                                onClick={(e) => handleStatusSummaryClick(e, labelStatus)}
                                sx={{
                                    pb: { xs: 1, sm: 2 },
                                    cursor: 'pointer',
                                    userSelect: 'none',
                                    '&:hover': { opacity: 0.85 },
                                }}
                            >
                                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold', color }}>
                                    {labelStatus}
                                    {': '}
                                </Typography>
                                <Typography variant="h6" component="span" sx={{ fontWeight: 'bold', color }}>
                                    {item.total}
                                </Typography>
                            </Box>
                        );
                    })}
                </Box>

                {/* Selector de módulo + seleccionar todos */}
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    justifyContent="space-between"
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    sx={{
                        width: '100%',
                        flex: '0 0 10%',
                        gap: { xs: 2, md: 4 },
                    }}
                >
                    <FormControl
                        variant="standard"
                        sx={{ width: { xs: '100%', sm: '75%' } }}
                    >
                        <InputLabel id="select-module-label">
                            Selecciona un módulo
                        </InputLabel>
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
                                            fontSize: theme.typography.h3.fontSize,
                                        },
                                    }}
                                    checked={
                                        currentModule.lockers.length > 0 &&
                                        selectedLockers.length === currentModule.lockers.length
                                    }
                                    onChange={(e) => handleSelectAll(e.target.checked)}
                                />
                            }
                            label="Seleccionar todos"
                            sx={{
                                alignSelf: { xs: 'flex-start', sm: 'center' },
                                '& .MuiFormControlLabel-label': {
                                    fontSize: theme.typography.h6.fontSize,
                                },
                            }}
                        />
                    )}
                </Stack>

                {/* Grid de lockers */}
                {currentModule && (
                    <Box
                        sx={{
                            flex: 1,
                            width: '100%',
                            overflowY: 'auto',
                            overflowX: 'hidden',
                            scrollBehavior: 'smooth',
                            pr: { xs: 1, sm: 2 },
                            mt: { xs: 1, sm: 2 },
                            p: { xs: 1, sm: 2 },
                            boxSizing: 'border-box',
                        }}
                    >
                        <Grid
                            container
                            // Responsivo: menos columnas en pantallas angostas
                            columns={{ xs: 2, sm: 3, md: 4, lg: 5 }}
                            spacing={{ xs: 1, sm: 1, md: 1 }}
                            justifyContent="center"
                            sx={{ minHeight: '100%', width: '100%' }}
                        >
                            {currentModule.lockers.map((locker) => {
                                const selected = selectedLockers.some(
                                    (item) => item.lockerCode === locker.lockerCode
                                );

                                const matchedStatus = dataStatus.general.find(
                                    (s) => s.status.toLowerCase() === locker.status.toLowerCase()
                                );
                                const color = matchedStatus ? matchedStatus.color : 'gray';
                                const selectedBg = alpha(color, 0.5);
                                const hoverSelectedBg = alpha(color, 0.8);
                                const textColor = theme.palette.getContrastText(
                                    selected ? selectedBg : color
                                );

                                return (
                                    <Grid
                                        key={locker.lockerCode}
                                        size={1} // cada casillero ocupa 1 de las 5 columnas
                                        sx={{
                                            maxHeight: '100%',
                                            display: 'flex',
                                            alignItems: 'stretch',
                                        }}
                                    >
                                        <Button
                                            variant="contained"
                                            onClick={() => handleLockerClick(locker)}
                                            sx={{
                                                backgroundColor: selected ? selectedBg : color,
                                                boxShadow: selected
                                                    ? `0 0 0 ${theme.spacing(0.5)} ${alpha(
                                                        theme.palette.secondary.main,
                                                        0.9
                                                    )}`
                                                    : 'none',
                                                color: textColor,
                                                width: '100%',
                                                height: '100%',
                                                minHeight: {
                                                    xs: theme.spacing(6.5),
                                                    sm: theme.spacing(7),
                                                    md: theme.spacing(7.5),
                                                },
                                                fontSize: {
                                                    xs: theme.typography.h6.fontSize,
                                                    sm: theme.typography.h5.fontSize,
                                                },
                                                lineHeight: 1,
                                                transition:
                                                    'box-shadow 140ms ease, background-color 140ms ease',
                                                '&:hover': {
                                                    backgroundColor: selected ? hoverSelectedBg : color,
                                                    opacity: selected ? 1 : 0.8,
                                                    boxShadow: selected
                                                        ? `0 0 0 ${theme.spacing(0.5)} ${alpha(
                                                            theme.palette.secondary.main,
                                                            0.9
                                                        )}`
                                                        : 'none',
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

                {/* Zona inferior: chips + acciones */}
                {currentModule && (
                    <Box sx={{ flex: '0 0 15%', width: '100%' }}>
                        {selectedLockers.length > 0 && (
                            <Stack
                                spacing={{ xs: 1.5, sm: 2 }}
                                alignItems="center"
                                sx={{
                                    mt: { xs: 1.5, sm: 2 },
                                    height: '100%',
                                    width: '100%',
                                }}
                            >
                                <Box
                                    sx={{
                                        maxHeight: 120,
                                        minHeight: 48,
                                        overflowY: 'auto',
                                        width: '100%',
                                        px: { xs: 1, sm: 2 },
                                        py: { xs: 0.5, sm: 1 },
                                        borderRadius: 2,
                                        border: `1px solid ${theme.palette.divider}`,
                                        backgroundColor: theme.palette.background.paper,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                    }}
                                >
                                    {selectedLockers.map((l) => (
                                        <Chip
                                            key={l.lockerCode}
                                            label={l.lockerCode}
                                            sx={{
                                                height: 40,
                                                fontSize: theme.typography.body1.fontSize,
                                                px: 1.5,
                                                borderRadius: 2,
                                            }}
                                        />
                                    ))}
                                </Box>

                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={{ xs: 1, sm: 1.5 }}
                                    sx={{
                                        width: '100%',
                                        maxHeight: '100%',
                                        p: { xs: 1, sm: 2 },
                                    }}
                                >
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={() => handleAction('abrir')}
                                        endIcon={<LockOpen />}
                                        sx={adminActionButtonSx(theme)}
                                    >
                                        Abrir
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={() => handleAction('liberar')}
                                        endIcon={<Lock />}
                                        sx={adminActionButtonSx(theme)}
                                    >
                                        Liberar
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        fullWidth
                                        onClick={handleMenuClick}
                                        endIcon={<Sync />}
                                        sx={adminActionButtonSx(theme)}
                                    >
                                        Cambiar estado
                                    </Button>

                                    <Menu
                                        anchorEl={anchorEl}
                                        open={menuOpen}
                                        onClose={handleMenuClose}
                                    >
                                        {dataStatus.general
                                            .filter((item) => {
                                                const status = item.status.toLowerCase();
                                                return status !== 'ocupado' && status !== 'reservado';
                                            })
                                            .map((item) => (
                                                <MenuItem
                                                    key={item.status}
                                                    onClick={() =>
                                                        handleStatusChange(item.status.toLowerCase())
                                                    }
                                                    sx={{
                                                        color: item.color,
                                                        fontWeight: 'bold',
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

                {/* Botón Reservar */}
                {config?.reserve?.enabled && (
                    <Box sx={{ mt: 'auto', width: '100%' }}>
                        <Button
                            variant="contained"
                            color="tertiary"
                            fullWidth
                            onClick={() => handleAction('reservar')}
                            endIcon={<Key />}
                            sx={adminActionButtonSx(theme)}
                        >
                            Reservar
                        </Button>
                    </Box>
                )}
            </Box>

            {loading && <Loading message={messageLoading} />}

            <StatusLockersPopper
                open={statusPopperOpen}
                anchorEl={statusAnchorEl}
                onClose={handleCloseStatusPopper}
                statusSelected={statusSelected}
                lockers={allLockers}
                statusColors={dataStatus.general}
            />

            <ShowErrorAPI
                open={showErrorAPIOpen}
                onConfirm={confirmShowErrorAPI}
                msg={messageErrorAPI}
                timeout={timeoutShowMessage}
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
