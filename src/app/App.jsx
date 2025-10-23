import { useState, useEffect } from 'react';
import { HashRouter } from 'react-router-dom';

import { Box, Container } from '@mui/material';
import utc from "dayjs/plugin/utc";
import dayjs from "dayjs";

import { AppbarBar } from '@shared/components/bars/AppbarBar.jsx';
import { Copyright } from '@shared/components/bars/Copyright.jsx';
import { useUser } from '@shared/context/UserContext.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useSchedulerReport } from '@shared/hooks/useScheduleReport.js';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { AppRoutes } from '@features/router/AppRouter.jsx';
import { GetReportLockers } from '@services/apis/report.js';
import { setVoiceOptions, getVoices, preloadVoice } from '@shared/utils/speak.js';
import { Loading } from '@shared/components/dialogs/Loading.jsx';

dayjs.extend(utc);

const USER_STORAGE_KEY = 'userInit';
const fileName = 'app';

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

const normalizeReportConfig = (report) => {
    // solo tomamos los campos relevantes
    return {
        daily: {
            enabled: report?.daily?.enabled,
            hour: report?.daily?.hour,
            minute: report?.daily?.minute
        },
        weekly: {
            enabled: report?.weekly?.enabled,
            dayOfWeek: report?.weekly?.dayOfWeek,
            hour: report?.weekly?.hour,
            minute: report?.weekly?.minute
        },
        monthly: {
            enabled: report?.monthly?.enabled,
            dayOfMonth: report?.monthly?.dayOfMonth,
            hour: report?.monthly?.hour,
            minute: report?.monthly?.minute
        },
        timezoneMode: report?.timezoneMode,
        timeInterval: report?.timeInterval,
    };
}

const useResetLocalStorageOnConfigChange = (config) => {
    useEffect(() => {
        if (!config?.report) return;

        const newConfig = normalizeReportConfig(config.report);
        const prevConfig = JSON.parse(localStorage.getItem("reportConfigSnapshot") || "null");

        if (!prevConfig || JSON.stringify(prevConfig) !== JSON.stringify(newConfig)) {
            // Config cambió → limpiar lastExecution y lastTarget
            localStorage.removeItem("lastExecution_daily");
            localStorage.removeItem("lastTarget_daily");
            localStorage.removeItem("lastExecution_Weekly");
            localStorage.removeItem("lastTarget_Weekly");
            localStorage.removeItem("lastExecution_Monthly");
            localStorage.removeItem("lastTarget_Monthly");
            log('info', '[Scheduler] Config cambió → reseteando localStorage');

            localStorage.setItem("reportConfigSnapshot", JSON.stringify(newConfig));
        }
    }, [config]);
}

export const App = () => {

    // Comentario cambio para subir a GitHub
    const { userInit, setUserInit } = useUser();
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()
    const config = useElectronConfig();
    const [loading, setLoading] = useState(true);

    // Alturas base en px
    const appBarBase = 100;   // alto típico del AppBar
    const footerBase = 80;   // alto footer

    // Ajustados con scale
    const appBarHeight = appBarBase * scale;
    const footerHeight = footerBase * scale;
    const [voiceGet, setVoiceGet] = useState(null);

    // 1) Cargar lista de voces según config
    useEffect(() => {
        if (!config) return;
        preloadVoice();
        loadVoices(config?.voice?.name || 'Sabina'); // sólo busca voces con config
    }, [config]);

    // 2) Aplicar opciones cuando haya voz y config
    useEffect(() => {
        if (!config) return;
        setVoiceOptions({
            voiceName: voiceGet?.name,
            rate: config?.voice?.rate || 1,
            volume: config?.voice?.volume || 1,
            pitch: config?.voice?.pitch || 1,
        });
        log('debug', `Voz configurada: ${voiceGet?.name || 'default'}, ...`);
    }, [config, voiceGet?.name]);

    useEffect(() => {

        if (!userInit) return;

        setLoading(false);

        localStorage.setItem('isCancelInsertMoney', false);

        const lsUserInit = localStorage.getItem(USER_STORAGE_KEY);

        if (!lsUserInit)
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInit));

        log('info', 'Componente App montado');
    }, [userInit]);

    useResetLocalStorageOnConfigChange(config);

    const executeReportTask = async (startDate, endDate, frequency) => {

        const timezoneMode = config.report?.timezoneMode || "local";

        log("info", `Generando payload en modo [${timezoneMode}]`);

        const formatUTC = (d, isEnd = false) =>
            dayjs(d)
                .utc()
                .set("second", isEnd ? 59 : 0)
                .format("YYYY-MM-DD HH:mm:ss");

        const payload = {
            startDate: formatUTC(startDate),        // segundos en 00
            endDate: formatUTC(endDate, true),      // segundos en 59
            sendEmail: true,
        };

        log("info", `Payload generado: ${JSON.stringify(payload)}`);

        try {
            const result = await GetReportLockers(payload);
            if (result.success) {
                log("info", `Datos del reporte obtenidos: ${JSON.stringify(result.data)}`);
            } else {
                log("error", result?.data?.message || "Error al obtener reporte");
            }
        } catch (err) {
            log("error", err.message || "Error al obtener reporte");
        }
    }

    const isEnabledDaily = !!config?.report?.daily?.enabled && (config?.login?.userOpera.toLowerCase() === userInit?.user.toLowerCase());
    log("info", `Scheduler diario habilitado: ${isEnabledDaily} | usuario config: ${config?.login?.userOpera.toLowerCase()} | usuario actual: ${userInit?.user.toLowerCase()}`);

    const isEnabledWeekly = !!config?.report?.weekly?.enabled && (config?.login?.userOpera.toLowerCase() === userInit?.user.toLowerCase());
    log("info", `Scheduler semanal habilitado: ${isEnabledWeekly} | usuario config: ${config?.login?.userOpera.toLowerCase()} | usuario actual: ${userInit?.user.toLowerCase()}`);

    const isEnabledMonthly = !!config?.report?.monthly?.enabled && (config?.login?.userOpera.toLowerCase() === userInit?.user.toLowerCase());
    log("info", `Scheduler mensual habilitado: ${isEnabledMonthly} | usuario config: ${config?.login?.userOpera.toLowerCase()} | usuario actual: ${userInit?.user.toLowerCase()}`);


    // Daily
    useSchedulerReport({
        frequency: "daily",
        hour: config?.report?.daily?.hour ?? 0,
        minute: config?.report?.daily?.minute ?? 0,
        enabled: isEnabledDaily,
        timeInterval: config?.report?.timeInterval || 60, // segundos
        task: async (startDate, endDate) => {
            await executeReportTask(startDate, endDate, "daily");
        },
    });

    // Weekly
    useSchedulerReport({
        frequency: "weekly",
        dayOfWeek: config?.report?.weekly?.dayOfWeek ?? 1,
        hour: config?.report?.weekly?.hour ?? 0,
        minute: config?.report?.weekly?.minute ?? 0,
        enabled: isEnabledWeekly,
        timeInterval: config?.report?.timeInterval || 60, // segundos
        task: async (startDate, endDate) => {
            await executeReportTask(startDate, endDate, "weekly");
        },
    });

    // Monthly
    useSchedulerReport({
        frequency: "monthly",
        dayOfMonth: config?.report?.monthly?.dayOfMonth ?? 1,
        hour: config?.report?.monthly?.hour ?? 0,
        minute: config?.report?.monthly?.minute ?? 0,
        enabled: isEnabledMonthly,
        timeInterval: config?.report?.timeInterval || 60, // segundos
        task: async (startDate, endDate) => {
            await executeReportTask(startDate, endDate, "monthly");
        },
    });

    const loadVoices = async (voiceName) => {
        const voices = await getVoices() || [];

        const found = voices.find(v => {
            const n = v.Name || v.name;   // soporta ambas claves
            return n && n.toLowerCase().includes(voiceName.toLowerCase());
        });

        if (found) {
            setVoiceGet(found);
        }
    };

    return (
        <HashRouter>
            <Container
                maxWidth={false}
                disableGutters
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100vh", // ocupa toda la pantalla
                    overflow: "hidden", // evita scroll doble
                }}
            >
                {/* AppBar fijo */}
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
                    <AppbarBar />
                </Box>

                {/* Contenido principal */}
                <Box
                    sx={{
                        flex: 1,
                        marginTop: `${appBarHeight}px`, // deja espacio bajo AppBar
                        overflow: "hidden",
                        width: "95%",
                        alignSelf: "center",
                    }}
                >
                    <AppRoutes />
                </Box>

                {/* Footer dentro del flujo (no fixed) */}
                <Box
                    sx={{
                        height: `${footerHeight}px`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                    }}
                >
                    <Copyright />
                </Box>
            </Container>

            {loading && (<Loading />)}
        </HashRouter>
    );
}
