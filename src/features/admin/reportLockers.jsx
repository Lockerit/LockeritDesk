import { useState, useEffect } from "react";
import dayjs from "dayjs";
import DateTime from "../utils/dateTime"; // tu componente personalizado
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
import GetReportLockers from "../apis/report.js";
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import LoadingScreen from '../dialogs/loading.jsx';
import ReportTable from "./tableReportLockers.jsx";
import {
    Box,
    Button,
    TextField
} from "@mui/material";

const ReportLockers = () => {
    const [endDate, setEndDate] = useState(dayjs());
    const [startDate, setStartDate] = useState(dayjs().hour(0).minute(0));
    const { factor } = useWindowSize();
    const scale = factor || 1;

    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);

    useEffect(() => {
        fetchDataReportLocker();
    }, []);

    const fetchDataReportLocker = async () => {
        setLoading(true);

        const payload = {
            startDate: dayjs(startDate).format("YYYY-MM-DD HH:mm:ss"),
            endDate: dayjs(endDate).format("YYYY-MM-DD HH:mm:ss"),
        };

        try {
            const result = await GetReportLockers(payload);

            if (result.success) {
                setReportData(result.data || []);
                setShowErrorAPIOpen(false);
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
                    flex: "0 0 5%", // 20% del alto fijo
                    display: "flex",
                    gap: 3,
                    alignItems: "flex-end",
                    p: 2,
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
                        variant="contained"
                        color="primary"
                        sx={{
                            height: `${48 * scale}px`,
                            fontSize: `${16 * scale}px`,
                            fontWeight: 'normal',
                        }}
                        onClick={fetchDataReportLocker}
                    >
                        Generar reporte
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
                    minHeight: 0, // 🔑 evita que los hijos desborden
                }}
            >
                <ReportTable data={reportData} />
            </Box>

            {loading && <LoadingScreen />}
            {showErrorAPIOpen && (
                <ShowErrorAPI
                    open={showErrorAPIOpen}
                    message={messageErrorAPI}
                    onClose={() => setShowErrorAPIOpen(false)}
                />
            )}
        </Box>
    );
};

export default ReportLockers;
