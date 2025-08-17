import { useState, useEffect } from "react";
import { Box, Button } from "@mui/material";
import dayjs from "dayjs";
import DateTime from "../utils/dateTime"; // tu componente personalizado
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
import GetReportLockers from "../apis/report.js";
import ShowErrorAPI from '../dialogs/showErrorAPI.jsx';
import LoadingScreen from '../dialogs/loading.jsx';

const ReportLockers = () => {

    const [endDate, setEndDate] = useState(dayjs());
    const [startDate, setStartDate] = useState(
        dayjs().hour(0).minute(0)
    );
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1; // de tu hook useElectronScreenData()
    const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
    const [messageErrorAPI, setMessageErrorAPI] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDataReportLocker();
    }, []);


    const fetchDataReportLocker = async () => {
        setLoading(true);

        const payload = {
            startDate: startDate,
            endDate: endDate
        };

        try {
            const result = await GetReportLockers(payload);

            if (result.success) {
                console.log("Datos de reporte obtenidos:", result.data);
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
        setLoading(false);
    };

    return (
        <>
            <Box sx={{ display: "flex", gap: 3, alignItems: "flex-end" }}>
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
                            height: `${42 * scale}px`,
                            fontSize: `${16 * scale}px`, // Ajusta el tamaño de fuente según el factor
                        }} // mismo alto que los textfield
                        onClick={() => {
                            console.log("Generar reporte");
                        }}
                    >
                        Generar reporte
                    </Button>
                </Box>
            </Box>

            {loading && (<LoadingScreen />)}
        </>
    );
};

export default ReportLockers;
