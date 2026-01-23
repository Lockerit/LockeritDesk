// src/App.jsx — versión revisada con logs estructurados y seguros
import { Box, Container } from '@mui/material';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { HashRouter } from 'react-router-dom';

import { AppRoutes } from '@features/router/AppRouter.jsx';
import { GetReportLockers } from '@services/apis/report.js';
import { closeWebSocket, connectWebSocket, isWebSocketConnected, waitWebSocketReady } from '@services/realtime/websocket.js';
import { AppbarBar } from '@shared/components/bars/AppbarBar.jsx';
import { Copyright } from '@shared/components/bars/Copyright.jsx';
import { Loading } from '@shared/components/dialogs/Loading.jsx';
import { useUser } from '@shared/context/UserContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { useSchedulerReport } from '@shared/hooks/useScheduleReport.js';
import { logger } from '@shared/utils/logger.js';
import { setVoiceOptions } from '@shared/utils/speak.js';

dayjs.extend(utc);

const USER_STORAGE_KEY = 'userInit';
const fileName = 'App';
const log = logger.scope(fileName);

const normalizeReportConfig = (report) => ({
    daily: { enabled: report?.daily?.enabled, hour: report?.daily?.hour, minute: report?.daily?.minute },
    weekly: { enabled: report?.weekly?.enabled, dayOfWeek: report?.weekly?.dayOfWeek, hour: report?.weekly?.hour, minute: report?.weekly?.minute },
    monthly: { enabled: report?.monthly?.enabled, dayOfMonth: report?.monthly?.dayOfMonth, hour: report?.monthly?.hour, minute: report?.monthly?.minute },
    timezoneMode: report?.timezoneMode,
    timeInterval: report?.timeInterval,
});

const useResetLocalStorageOnConfigChange = (config) => {
    useEffect(() => {
        if (!config?.report) return;
        const next = normalizeReportConfig(config.report);
        const prev = JSON.parse(localStorage.getItem('reportConfigSnapshot') || 'null');
        if (!prev || JSON.stringify(prev) !== JSON.stringify(next)) {
            localStorage.removeItem('lastExecution_daily');
            localStorage.removeItem('lastTarget_daily');
            localStorage.removeItem('lastExecution_Weekly');
            localStorage.removeItem('lastTarget_Weekly');
            localStorage.removeItem('lastExecution_Monthly');
            localStorage.removeItem('lastTarget_Monthly');
            log.info('Scheduler: configuración cambiada, reseteo de snapshots');
            localStorage.setItem('reportConfigSnapshot', JSON.stringify(next));
        }
    }, [config]);
};

export const App = () => {
    const { userInit } = useUser();
    const config = useElectronConfig();
    const [loading, setLoading] = useState(true);
    const [voiceGet, setVoiceGet] = useState(null);

    // Usuarios normalizados (evita .toLowerCase() sobre undefined)
    const cfgUser = useMemo(() => (config?.login?.userOpera || '').toLowerCase(), [config?.login?.userOpera]);
    const curUser = useMemo(() => (userInit?.user || '').toLowerCase(), [userInit?.user]);

    // Flags normalizados
    const isEnabledDaily = !!config?.report?.daily?.enabled && cfgUser === curUser;
    const isEnabledWeekly = !!config?.report?.weekly?.enabled && cfgUser === curUser;
    const isEnabledMonthly = !!config?.report?.monthly?.enabled && cfgUser === curUser;
    // util opcional para timeout en promesas
    const withTimeout = (p, ms = 3000) =>
        Promise.race([p, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);

    // normaliza nombre de voz (Windows / navegador)
    const voiceNameOf = (v) => v?.Name || v?.name || v?.DisplayName || '';

    const getBrowserVoices = () =>
        new Promise((resolve) => {
            const direct = window.speechSynthesis?.getVoices?.() || [];
            if (direct.length) return resolve(direct);
            // algunos navegadores cargan asíncrono
            const on = () => {
                const voices = window.speechSynthesis.getVoices() || [];
                window.speechSynthesis.removeEventListener('voiceschanged', on);
                resolve(voices);
            };
            window.speechSynthesis?.addEventListener?.('voiceschanged', on);
            // fallback por si nunca dispara
            setTimeout(() => resolve(window.speechSynthesis?.getVoices?.() || []), 1500);
        });

    /** loadVoices con useCallback */
    const loadVoices = useCallback(
        async (voiceName) => {
            const useDesktopVoice = !!config?.voice?.isVoiceDesktop;
            try {
                const voices = useDesktopVoice
                    ? await withTimeout(window.electronAPI?.getVoices?.() ?? Promise.resolve([]), 4000)
                    : await withTimeout(getBrowserVoices(), 4000);

                log.info(`Voz solicitada: ${voiceName || '(predeterminada)'}`);
                log.info(
                    `Voces disponibles: { count: ${voices.length}, voices: ${voices
                        .map(voiceNameOf)
                        .join(', ')} }`
                );

                const query = (voiceName || '').toLowerCase();
                const found = voices.find((v) => voiceNameOf(v).toLowerCase().includes(query));

                if (found) {
                    const resolvedName = voiceNameOf(found);
                    log.info(`Voz encontrada: { name: ${resolvedName} }`);
                    setVoiceGet({
                        ...found,
                        name: resolvedName,
                        isDesktop: useDesktopVoice,
                    });
                } else {
                    log.warn(`Voz no encontrada "${voiceName}", usando predeterminada`);
                    setVoiceGet(null);
                }
            } catch (e) {
                log.error(`Error cargando voces: ${e?.message || e}`);
                setVoiceGet(null);
            }
        },
        [config] // deps reales; no pongas log ni setVoiceGet para no re-crear innecesariamente
    );

    // 1) Cargar lista de voces según config
    useEffect(() => {
        const requested = config?.voice?.name || '';
        loadVoices(requested);

        if (!config?.voice?.isVoiceDesktop && 'speechSynthesis' in window) {
            const handler = () => loadVoices(requested);
            window.speechSynthesis.addEventListener('voiceschanged', handler);
            return () => window.speechSynthesis.removeEventListener('voiceschanged', handler);
        }
    }, [config, loadVoices]);

    // 2) Aplicar opciones cuando haya voz y config (log estructurado)
    useEffect(() => {
        if (!config) return;
        const opts = {
            voiceName: voiceGet?.name,
            rate: config?.voice?.rate || 1,
            volume: config?.voice?.volume || 1,
            pitch: config?.voice?.pitch || 1,
            useDesktopVoice: !!config?.voice?.isVoiceDesktop,
        };
        setVoiceOptions(opts);
        log.debug(`TTS configurado: { opts: ${JSON.stringify(opts)}, voice: ${voiceGet?.name || 'default'} }`
        );
    }, [config, voiceGet?.name]);

    // 3) App montada
    useEffect(() => {
        if (!userInit) return;
        setLoading(false);
        localStorage.setItem('isCancelInsertMoney', false);
        if (!localStorage.getItem(USER_STORAGE_KEY)) {
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userInit));
        }
        log.info(`App montada: { user: ${userInit?.user} }`);
    }, [userInit]);

    useResetLocalStorageOnConfigChange(config);

    // 4) WebSocket lifecycle (operador): conectar al iniciar sesión y cerrar en logout/exit
    useEffect(() => {
        let alive = true;

        const shouldConnect = !!userInit?.authenticatedOpera && !userInit?.closeSession && !userInit?.closeWindow;

        const ensureConnected = async () => {
            if (!shouldConnect) return;
            try {
                if (!isWebSocketConnected()) {
                    await connectWebSocket();
                }
                await waitWebSocketReady(5000);
                log.info('ws.lifecycle.connected');
            } catch (e) {
                if (!alive) return;
                log.warn('ws.lifecycle.connect.error', { msg: e?.message || String(e) });
            }
        };

        if (shouldConnect) {
            ensureConnected();
        } else {
            if (isWebSocketConnected()) {
                closeWebSocket();
                log.info('ws.lifecycle.closed');
            }
        }

        return () => {
            alive = false;
        };
    }, [userInit?.authenticatedOpera, userInit?.closeSession, userInit?.closeWindow]);

    // 5) Cierre de WS al salir de la app
    useEffect(() => {
        const handleBeforeUnload = () => {
            closeWebSocket();
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    // 6) Log de flags en un efecto (evita log en cada render)
    useEffect(() => {
        log.info(`Scheduler flags: { daily: ${isEnabledDaily}, weekly: ${isEnabledWeekly}, monthly: ${isEnabledMonthly}, configUser: ${cfgUser}, currentUser: ${curUser} }`);
    }, [isEnabledDaily, isEnabledWeekly, isEnabledMonthly, cfgUser, curUser]);

    const executeReportTask = async (startDate, endDate, frequency) => {
        const timezoneMode = config?.report?.timezoneMode || 'local';
        const formatUTC = (d, isEnd = false) =>
            dayjs(d).utc().set('second', isEnd ? 59 : 0).format('YYYY-MM-DD HH:mm:ss');

        const payload = {
            startDate: formatUTC(startDate),
            endDate: formatUTC(endDate, true),
            sendEmail: true,
        };

        log.info(`Generando reporte: { frequency: ${frequency}, timezoneMode: ${timezoneMode}, payload: ${JSON.stringify(payload)} }`);

        try {
            const result = await GetReportLockers(payload);
            if (result?.success) {
                const summary = Array.isArray(result?.data)
                    ? { rows: result.data.length }
                    : { keys: Object.keys(result?.data || {}) };
                log.info(`Reporte obtenido: { frequency: ${frequency}, ${summary} }`);
            } else {
                log.error(`Error al obtener reporte: { frequency: ${frequency}, status: ${result?.status}, message: ${result?.data?.message}
                }`);
            }
        } catch (err) {
            log.error(`Excepción al obtener reporte: { frequency: ${frequency}, error: ${err?.message} } `);
        }
    };

    // Schedulers
    useSchedulerReport({
        frequency: 'daily',
        hour: config?.report?.daily?.hour ?? 0,
        minute: config?.report?.daily?.minute ?? 0,
        enabled: isEnabledDaily,
        timeInterval: config?.report?.timeInterval || 60,
        task: (start, end) => executeReportTask(start, end, 'daily'),
    });

    useSchedulerReport({
        frequency: 'weekly',
        dayOfWeek: config?.report?.weekly?.dayOfWeek ?? 1,
        hour: config?.report?.weekly?.hour ?? 0,
        minute: config?.report?.weekly?.minute ?? 0,
        enabled: isEnabledWeekly,
        timeInterval: config?.report?.timeInterval || 60,
        task: (start, end) => executeReportTask(start, end, 'weekly'),
    });

    useSchedulerReport({
        frequency: 'monthly',
        dayOfMonth: config?.report?.monthly?.dayOfMonth ?? 1,
        hour: config?.report?.monthly?.hour ?? 0,
        minute: config?.report?.monthly?.minute ?? 0,
        enabled: isEnabledMonthly,
        timeInterval: config?.report?.timeInterval || 60,
        task: (start, end) => executeReportTask(start, end, 'monthly'),
    });

    return (
        <HashRouter>
            <Container
                maxWidth={false}
                disableGutters
                sx={{
                    display: 'grid',
                    gridTemplateRows: '8% 87% 5%',
                    height: '100vh',
                    overflow: 'hidden'
                }}
            >
                {/* 10%: Appbar */}
                <Box sx={{ overflow: 'hidden' }}>
                    <AppbarBar position="static" containerPadding="2.5%" />
                </Box>

                {/* 80%: Contenido enrutado, con scroll propio */}
                <Box
                    sx={{
                        minHeight: 0,           // permite que overflow funcione dentro de grid
                        overflow: 'auto',       // scroll del contenido central
                        px: '2.5%'              // equivalente a tu width 95% centrado
                    }}
                >
                    <AppRoutes />
                </Box>

                {/* 10%: Footer */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden'
                    }}
                >
                    <Copyright />
                </Box>
            </Container>

            {loading && <Loading />}
        </HashRouter>
    );
};
