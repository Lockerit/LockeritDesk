import { Summarize } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useState, useEffect, useCallback } from 'react';

import { GetReportLockers } from '@services/apis/report.js';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { DateTime } from '@shared/components/time/DateTime.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';

import { TableReportLockers } from './TableReportLockers.jsx';

dayjs.extend(utc);

const fileName = 'ReportLockers';
const log = logger.scope(fileName);

export const ReportLockers = () => {
    const [endDate, setEndDate] = useState(dayjs());
    const [startDate, setStartDate] = useState(
        dayjs().hour(0).minute(0).second(0)
    );

    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [isErrorMsj, setIsErrorMsj] = useState(true);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();

    const config = useElectronConfig();
    const theme = useTheme();

    useEffect(() => {
        if (!config) return;
        const t = config?.paramsHtml?.modalTimeouts?.timeoutShowMessage;
        if (typeof t === 'number') setTimeoutShowMessage(t);
        log.info('Config cargada para ReportLockers');
    }, [config]);

    useEffect(() => {
        log.info(
            `Cambio de rango → start=${startDate.format(
                'YYYY-MM-DD HH:mm:ss'
            )} end=${endDate.format('YYYY-MM-DD HH:mm:ss')}`
        );
    }, [startDate, endDate]);

    const fetchDataReportLocker = useCallback(
        async (showMsg = false) => {
            setIsErrorMsj(true);
            setLoading(true);

            const formatUTC = (d, isEnd = false) =>
                dayjs(d)
                    .utc()
                    .set('second', isEnd ? 59 : 0)
                    .format('YYYY-MM-DD HH:mm:ss');

            const payload = {
                startDate: formatUTC(startDate),
                endDate: formatUTC(endDate, true),
                sendEmail: false,
            };

            try {
                log.info(
                    `GET /report → inicio startUTC=${payload.startDate} endUTC=${payload.endDate}`
                );
                const t0 = Date.now();

                const result = await GetReportLockers(payload);

                const ms = Date.now() - t0;
                if (result?.success) {
                    const rows = Array.isArray(result?.data)
                        ? result.data.length
                        : 0;
                    setReportData(result?.data || []);
                    log.info(`GET /report → ok rows=${rows} timeMs=${ms}`);

                    if (showMsg) {
                        let msg = '';
                        if (!result?.data || rows === 0) {
                            msg = 'No se encontraron resultados';
                            setIsErrorMsj(true);
                        } else {
                            msg = 'Reporte generado con éxito';
                            setIsErrorMsj(false);
                        }
                        setMessageErrorAPI(msg);
                        setShowErrorAPIOpen(true);
                    } else {
                        setShowErrorAPIOpen(false);
                    }
                } else {
                    const msg =
                        typeof result?.data === 'string'
                            ? result.data
                            : result?.data?.message || 'Error al obtener reporte';

                    setMessageErrorAPI(msg);
                    setShowErrorAPIOpen(true);
                    log.error(`GET /report → fail: ${msg}`);
                }
            } catch (err) {
                setMessageErrorAPI(
                    err?.message || 'Error al obtener reporte'
                );
                setShowErrorAPIOpen(true);
                log.error(
                    `GET /report → exception: ${err?.message || err}`
                );
            } finally {
                setLoading(false);
                log.info('GET /report → fin');
            }
        },
        [startDate, endDate]
    );

    useEffect(() => {
        log.info(
            'Montando vista ReportLockers, solicitando datos iniciales'
        );
        fetchDataReportLocker(false);
    }, [fetchDataReportLocker]);

    return (
        <Box
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Filtros */}
            <Box
                sx={{
                    flex: '0 0 auto',
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: {
                        xs: theme.spacing(2),
                        md: theme.spacing(3),
                    },
                    alignItems: { xs: 'stretch', md: 'flex-end' },
                    p: {
                        xs: theme.spacing(1.5),
                        md: theme.spacing(2),
                    },
                }}
            >
                <Box sx={{ flex: 1 }}>
                    <DateTime
                        label="Fecha y hora inicial"
                        value={startDate}
                        onChange={setStartDate}
                        showTime
                    />
                </Box>

                <Box sx={{ flex: 1 }}>
                    <DateTime
                        label="Fecha y hora final"
                        value={endDate}
                        onChange={setEndDate}
                        showTime
                    />
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: { xs: 'stretch', md: 'flex-start' },
                    }}
                >
                    <Button
                        variant="outlined"
                        color="primary"
                        sx={{
                            mt: { xs: theme.spacing(1.5), md: 0 },
                            alignSelf: {
                                xs: 'stretch',
                                md: 'flex-end',
                            },
                            px: theme.spacing(3),
                            py: theme.spacing(1.5),
                            fontSize: theme.typography.h6.fontSize,
                            fontWeight: 'normal',
                            whiteSpace: 'nowrap',
                        }}
                        onClick={() => {
                            log.info('Click generar reporte');
                            fetchDataReportLocker(true);
                        }}
                    >
                        Generar
                        <Summarize
                            sx={{
                                fontSize: theme.typography.h5.fontSize,
                                ml: theme.spacing(1.5),
                            }}
                        />
                    </Button>
                </Box>
            </Box>

            {/* Tabla */}
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: '1 1 auto',
                    p: {
                        xs: theme.spacing(1.5),
                        md: theme.spacing(2),
                    },
                    minHeight: 0,
                }}
            >
                <TableReportLockers
                    data={reportData}
                    startDate={startDate}
                    endDate={endDate}
                />
            </Box>

            {loading && <Loading />}

            {showErrorAPIOpen && (
                <ShowErrorAPI
                    open={showErrorAPIOpen}
                    onConfirm={() => {
                        setShowErrorAPIOpen(false);
                        log.info('Cerrar modal de resultado de reporte');
                    }}
                    msg={messageErrorAPI}
                    timeout={timeoutShowMessage}
                    isError={isErrorMsj}
                />
            )}
        </Box>
    );
};
