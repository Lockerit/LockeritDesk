import { useState, useEffect } from 'react';
import { Box, Container } from '@mui/material';
import { HashRouter } from 'react-router-dom';
import DenseAppBar from '../bar/appbar.jsx';
import Copyright from '../bar/copyright.jsx';
import AppRoutes from '../router/router.jsx';
import { useUser } from '../context/userContext.jsx';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
import { useSchedulerReport } from '../hooks/useScheduleReport.js';
import { useElectronConfig } from '../hooks/useConfig.js';
import dayjs from "dayjs";
import GetReportLockers from '../apis/report.js';

const USER_STORAGE_KEY = 'userInit';
const fileName = 'app';

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export default function App() {
    const { userInit, setUserInit } = useUser();
    const [version, setVersion] = useState('');
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1; // de tu hook useElectronScreenData()
    const config = useElectronConfig();

    // Alturas base en px
    const appBarBase = 64;   // alto típico del AppBar
    const footerBase = 64;   // alto footer

    // Ajustados con scale
    const appBarHeight = appBarBase * scale;
    const footerHeight = footerBase * scale;

    useEffect(() => {
        if (!userInit) return;

        localStorage.setItem('isCancelInsertMoney', false);

        const lsUserInit = localStorage.getItem(USER_STORAGE_KEY);
        if (!lsUserInit)
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInit));

        log('info', 'Componente App montado');

        try {
            const versionResult = window.electronAPI?.getAppVersion?.();
            if (versionResult) {
                setVersion(versionResult);
                log('info', `Versión cargada: ${versionResult}`);
            } else {
                log('warn', 'No se pudo obtener la versión de la aplicación');
            }
        } catch (err) {
            log('error', `Error al obtener la versión: ${err.message}`);
        }
    }, []);

    useSchedulerReport({
        frequency: config?.report?.frequency || "daily",
        dayOfWeek: config?.report?.dayOfWeek || 1,
        dayOfMonth: config?.report?.dayOfMonth || 1,
        hour: config?.report?.hour || 0,
        minute: config?.report?.minute || 5,
        enabled: !!config,
        task: async (startDate, endDate) => {

            if (!config) {
                log("warn", "Configuración no disponible, no se ejecutará la tarea programada");
                return;
            }

            const timezoneMode = config?.report?.timezoneMode || "local";
            log("info", `Generando payload en modo [${timezoneMode}]`);

            const formatter = timezoneMode === "utc"
                ? (d) => d.utc()
                : (d) => d

            const payload = {
                startDate: formatter(startDate).format("YYYY-MM-DD HH:mm:ss"),
                endDate: formatter(endDate).format("YYYY-MM-DD HH:mm:ss"),
            };

            log("info", `Payload generado: ${JSON.stringify(payload)}`);

            try {
                const result = await GetReportLockers(payload);

                if (result.success) {
                    log("info", `Datos del reporte obtenidos: ${JSON.stringify(result.data)}`);

                    if (!Array.isArray(result.data) || result.data.length === 0) {
                        log("info", "No hay registros para esa fecha");
                    }
                } else {
                    const msg =
                        typeof result?.data === "string"
                            ? result.data
                            : result?.data?.message || "Error al obtener reporte";

                    log("error", msg);
                }
            } catch (err) {
                log("error", err.message || "Error al obtener reporte");
            }
        },
    });

    return (
        <HashRouter>
            <Container
                maxWidth={false}
                sx={{
                    minHeight: "100vh",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* AppBar */}
                <Box
                    sx={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${appBarHeight}px`,
                        zIndex: 1200,
                    }}
                >
                    <DenseAppBar />
                </Box>

                {/* Contenido */}
                <Box
                    sx={{
                        marginTop: `${appBarHeight}px`, // mismo alto del AppBar
                        height: `calc(100vh - ${appBarHeight}px - ${footerHeight}px)`,
                        overflow: "auto",
                    }}
                >
                    <AppRoutes />
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        height: `${footerHeight}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                >
                    <Copyright />
                </Box>
            </Container>
        </HashRouter>
    );
}
