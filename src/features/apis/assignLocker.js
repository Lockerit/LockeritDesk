import axios from './axiosConfig.js';
import API_ROUTES from '../router/pathService.js';
import { getEnv, subscribeEnv } from '../hooks/envStore.js';
import {
    connectWebSocket,
    closeWebSocket,
    isWebSocketConnected,
    onMessage,
    waitWebSocketReady
} from './websocket.js';
import { cancelObservable } from '../utils/cancelObservable.js';

const fileName = 'assignLocker';
let abortCancel = null; // Controla la cancelación de la petición

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};


const assignLocker = async (payload, timeoutMs) => {
    const env = getEnv();
    const maxRetries = env?.apiBaseMaxRetries || 5;
    const retryDelay = (env?.apiBaseDelayRetries * 1000) || 1;
    abortCancel = false;

    log('debug', 'peticion assign 0', isWebSocketConnected());
    log('info', `Iniciando petición para asignar casillero con hasta ${maxRetries} reintentos`);

    let cancelled = false;
    let abortController = new AbortController();
    cancelObservable.setCancel(false);

    const cancelListener = (e) => {
        if (e.detail) {
            cancelled = true;
            abortController.abort(); // Cancela la petición HTTP activa
        }
    };
    cancelObservable.onCancel(cancelListener);

    try {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            log('debug', 'peticion assign: ' + attempt + ' - cancel:' + cancelled);

            if (cancelled) {
                log('info', `Conexión WebSocket cerrada, abortando intento ${attempt} - cancelled`);
                cancelObservable.setCancel(false);
                abortCancel = true;
                return {
                    success: false,
                    data: '',
                    status: 499,
                };
            }

            try {
                abortController = new AbortController(); // Nuevo controller por intento
                log('info', `Intento ${attempt}: HOST -> ${axios.getUri()}`);
                log('info', `Intento ${attempt}: URL -> ${API_ROUTES.ASSIGN_LOCKER}`);
                log('info', `Intento ${attempt}: Request -> ${JSON.stringify(payload)}`);

                const response = await axios.post(
                    API_ROUTES.ASSIGN_LOCKER,
                    payload,
                    { timeout: timeoutMs, signal: abortController.signal }
                );

                log('info', `Response. Status: ${response.status}`);
                log('info', `Response. Data: ${JSON.stringify(response.data)}`);

                return {
                    success: true,
                    data: response.data,
                    status: response.status,
                };

            } catch (error) {
                if (axios.isCancel?.(error) || error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
                    log('warn', `Petición cancelada por el usuario`);
                    log('info', `Conexión WebSocket cerrada, abortando intento ${attempt} - catch`);
                    abortCancel = true;
                    return {
                        success: false,
                        data: '',
                        status: 499,
                    };
                }

                const status = error?.response?.status || 500;
                const msg = `Error HTTP: ${status} - ${error?.response?.data?.message || error.message}`;
                log('error', `[intento ${attempt}] ${msg}`);

                if (status === 500 && attempt < maxRetries) {
                    log('warn', `Reintentando en ${retryDelay}ms...`);
                    await new Promise(res => setTimeout(res, retryDelay));
                } else {
                    return {
                        success: false,
                        data: error.response?.data || { message: msg },
                        status,
                    };
                }
            }
        }
    } finally {
        cancelObservable.removeEventListener('cancel', cancelListener);
    }
};

// assignLocker.js
export const paymentService = async (payload, timeoutMs, onTotalUpdate, onLoading) => {
    if (onLoading && typeof onLoading === "function") {
        onLoading(false);
    }

    log("info", `Timeout por parámetro: ${timeoutMs}`);

    const env = getEnv();
    const effectiveTimeout = timeoutMs
        ?? ((env?.apiBaseTimeout ? Number(env.apiBaseTimeout) * 1000 : 30000));

    log("info", `Timeout efectivo en ejecución: ${effectiveTimeout}`);

    try {
        // 🔄 Si había un WS abierto, cerramos primero
        if (isWebSocketConnected()) {
            log("warn", "Ya había un WebSocket abierto, cerrando antes de reconectar...");
            closeWebSocket();
            await new Promise((r) => setTimeout(r, 200));
        }

        // 1) Conectar
        await connectWebSocket();

        // 2) Esperar a que esté realmente listo
        await waitWebSocketReady(5000);
        log("info", "WebSocket listo, enviando HTTP /assign...");

        let wsComplete = false;
        let httpResponse = null;

        // 3) Escuchar mensajes WS
        onMessage((data) => {
            log("info", `Mensaje WebSocket recibido: ${JSON.stringify(data)}`);

            if (onTotalUpdate) onTotalUpdate(data.total);

            if (data.complete === true) {
                wsComplete = true;
                if (onLoading) onLoading(true);
            }
        });

        // 4) HTTP principal
        const httpPromise = assignLocker(payload, effectiveTimeout)
            .then((res) => {
                httpResponse = res;

                if (!res.success) {
                    if (res.status === 499) {
                        log("warn", "WebSocket desconectado - status 499");
                        closeWebSocket();
                        return res;
                    }
                    const err = res.data?.message || "Error HTTP en servidor (002)";
                    log("error", err);
                    closeWebSocket();
                }

                wsComplete = true;
                closeWebSocket();
                return "HTTP complete";
            })
            .catch((err) => {
                log("error", `Error en HTTP: ${err.message}`);
                closeWebSocket();
                throw err;
            });

        // 5) Timeout para cortar HTTP
        const httpTimeout = new Promise((_, reject) =>
            setTimeout(() => {
                const err = "Timeout en HTTP (002)";
                log("error", err);
                closeWebSocket();
                reject(new Error(err));
            }, effectiveTimeout)
        );

        await Promise.race([httpPromise, httpTimeout]);

        closeWebSocket();
        log("info", "Proceso completado exitosamente");

        return {
            websocket: wsComplete,
            http: httpResponse,
        };
    } catch (error) {
        log("error", `Error general: ${error.message}`);
        closeWebSocket();
        return {
            websocket: false,
            http: null,
            error: error.message || "Error inesperado (003)",
        };
    }
};

// Escucha cambios en .env para actualizar baseURL dinámicamente
subscribeEnv((env) => {
    if (env?.apiBaseTimeout) {
        const newTimeout = Number(env.apiBaseTimeout);
        log('info', `API BaseTimeout actualizada dinámicamente: ${newTimeout}`);
        axios.defaults.timeout = newTimeout;
    }
});
