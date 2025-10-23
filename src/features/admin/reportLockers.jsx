import { Summarize } from '@mui/icons-material';
import { Box, Button } from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useState, useEffect, useCallback } from "react";

import { GetReportLockers } from "@services/apis/report.js";
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { DateTime } from "@shared/components/time/DateTime.jsx";
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';

import { TableReportLockers } from "./TableReportLockers.jsx";

dayjs.extend(utc);

export const ReportLockers = () => {
    const [endDate, setEndDate] = useState(dayjs());
    const [startDate, setStartDate] = useState(dayjs().hour(0).minute(0).second(0));
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [isErrorMsj, setIsErrorMsj] = useState(true);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [timeoutShowMessage, setTimeoutShowMessage] = useState();
    const config = useElectronConfig();

    // Lee timeout del config cuando esté disponible
    useEffect(() => {
        if (!config) return;
        const t = config?.paramsHtml?.modalTimeouts?.timeoutShowMessage;
        if (typeof t === 'number') setTimeoutShowMessage(t);
    }, [config]);

    // fetch con deps estables
    const fetchDataReportLocker = useCallback(
        async (showMsg = false) => {
            setIsErrorMsj(true);
            setLoading(true);

            const formatUTC = (d, isEnd = false) =>
                dayjs(d)
                    .utc()
                    .set("second", isEnd ? 59 : 0)
                    .format("YYYY-MM-DD HH:mm:ss");

            const payload = {
                startDate: formatUTC(startDate),       // segundos en 00
                endDate: formatUTC(endDate, true),     // segundos en 59
                sendEmail: false,
            };

            try {
                const result = await GetReportLockers(payload);

                if (result?.success) {
                    setReportData(result?.data || []);

                    if (showMsg) {
                        let msg = '';
                        if (!result?.data) {
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
                    const msg = typeof result?.data === 'string'
                        ? result.data
                        : result?.data?.message || 'Error al obtener reporte';

                    setMessageErrorAPI(msg);
                    setShowErrorAPIOpen(true);
                }
            } catch (err) {
                setMessageErrorAPI(err.message || 'Error al obtener reporte');
                setShowErrorAPIOpen(true);
            } finally {
                setLoading(false);
            }
        },
        [startDate, endDate]
    );

    // Carga inicial
    useEffect(() => {
        fetchDataReportLocker(false);
    }, [fetchDataReportLocker]);

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {/* 🔹 Filtros */}
            <Box
                sx={{
                    flex: "0 0 3%",
                    display: "flex",
                    gap: 3 * scale,
                    alignItems: "flex-end",
                    p: 2 * scale,
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
                <Box>
                    <Button
                        variant="outlined"
                        color="primary"
                        sx={{
                            height: `${60 * scale}px`,
                            fontSize: `${24 * scale}px`,
                            fontWeight: 'normal',
                        }}
                        onClick={() => fetchDataReportLocker(true)}
                    >
                        Generar reporte
                        <Summarize sx={{ fontSize: 28 * scale, ml: 3 * scale }} />
                    </Button>
                </Box>
            </Box>

            {/* Tabla */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: "1 1 95%",
                    p: 2 * scale,
                    minHeight: 0,
                }}
            >
                <TableReportLockers data={reportData} startDate={startDate} endDate={endDate} />
            </Box>

            {loading && <Loading />}

            {showErrorAPIOpen && (
                <ShowErrorAPI
                    open={showErrorAPIOpen}
                    onConfirm={() => setShowErrorAPIOpen(false)}
                    msg={messageErrorAPI}
                    timeout={timeoutShowMessage}
                    isError={isErrorMsj}
                    disableEnforceFocus
                    disableAutoFocus
                    disableRestoreFocus
                />
            )}
        </Box>
    );
};
