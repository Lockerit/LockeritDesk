import { useState, useEffect } from "react";
import { DateTime } from "@shared/components/time/DateTime.jsx";
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { GetReportLockers } from "@services/apis/report.js";
import { ShowErrorAPI } from '@shared/components/dialogs/ShowErrorAPI.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { TableReportTableLockers } from "./TableReportLockers.jsx";
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import {
    Summarize
} from '@mui/icons-material';
import {
    Box,
    Button,
    TextField
} from "@mui/material";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);

const fileName = 'ReportLockers';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

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
    let formatter = (d) => dayjs(d); // por defecto local

    useEffect(() => {
        fetchDataReportLocker(false);
    }, []);

    useEffect(() => {
        if (!config) return;

        if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
            setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
        }

        let timezoneMode = config?.report?.timezoneMode || "local";

        formatter = timezoneMode === "utc"
            ? (d) => dayjs(d).utc()
            : (d) => dayjs(d);

    }, [config])

    const fetchDataReportLocker = async (showMsg = false) => {
        setIsErrorMsj(true);
        setLoading(true);

        const formatUTC = (d, isEnd = false) =>
            dayjs(d)
                .utc()
                .set("second", isEnd ? 59 : 0)
                .format("YYYY-MM-DD HH:mm:ss");

        const payload = {
            startDate: formatUTC(startDate),        // segundos en 00
            endDate: formatUTC(endDate, true),      // segundos en 59
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
                    log('info', msg);
                    setMessageErrorAPI(msg);;
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
    };

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>

            {/* 🔹 Sección filtros (20%) */}
            <Box
                sx={{
                    flex: "0 0 3%", // 20% del alto fijo
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
                        showTime={true}
                    />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <DateTime
                        label="Fecha y hora final"
                        value={endDate}
                        onChange={setEndDate}
                        showTime={true}
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

            {/* Sección tabla (80%) */}
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    flex: "1 1 95%",
                    p: 2 * scale,
                    minHeight: 0, // evita que los hijos desborden
                }}
            >
                <TableReportTableLockers data={reportData} startDate={startDate} endDate={endDate} />
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

