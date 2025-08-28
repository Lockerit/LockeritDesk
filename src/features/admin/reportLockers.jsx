import { useState, useEffect } from "react";
import DateTime from "../utils/dateTime"; // tu componente personalizado
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
import GetReportLockers from "../apis/report.js";
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import LoadingScreen from '../dialogs/loading.jsx';
import ReportTable from "./tableReportLockers.jsx";
import { useElectronConfig } from '../hooks/useConfig.js';
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

const fileName = 'reportLockers';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

const ReportLockers = () => {
    const [endDate, setEndDate] = useState(dayjs());
    const [startDate, setStartDate] = useState(dayjs().hour(0).minute(0).second(0));
    const { factor } = useWindowSize();
    const scale = factor || 1;

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

        const formatUTC = (d) => dayjs(d).utc().format("YYYY-MM-DD HH:mm:ss");

        const payload = {
            startDate: formatUTC(startDate),
            endDate: formatUTC(endDate),
            sendEmail: false
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
                    />
                </Box>
                <Box sx={{ flex: 1 }}>
                    <DateTime
                        label="Fecha y hora final"
                        value={endDate}
                        onChange={setEndDate}
                    />
                </Box>
                <Box>
                    <Button
                        variant="outlined"
                        color="primary"
                        sx={{
                            height: `${80 * scale}px`,
                            fontSize: `${24 * scale}px`,
                            fontWeight: 'normal',
                        }}
                        onClick={() => fetchDataReportLocker(true)}
                    >
                        Generar reporte
                        <Summarize sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
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
                <ReportTable data={reportData} startDate={startDate} endDate={endDate} />
            </Box>

            {loading && <LoadingScreen />}

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

export default ReportLockers;
