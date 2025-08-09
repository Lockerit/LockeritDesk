import axios from './axiosConfig';
import API_ROUTES from '../router/pathService.js';
import { getEnv, subscribeEnv } from '../hooks/envStore.js';
import {
    connectWebSocket,
    closeWebSocket,
    isWebSocketConnected,
    onMessage,
} from './websocket.js';

const fileName = 'addAssignLocker';

const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

const AddAssignLocker = async (payload, timeoutMs) => {

    const env = getEnv(); // 🔁 Actualiza si `.env` cambió

    const maxRetries = env?.apiBaseMaxRetries || 5;
    const retryDelay = (env?.apiBaseDelayRetries * 1000) || 1;

    log('info', `Iniciando petición para asignar casillero con hasta ${maxRetries} reintentos`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log('info', `Intento ${attempt}: HOST -> ${axios.getUri()}`);
            log('info', `Intento ${attempt}: URL -> ${API_ROUTES.ASSIGN_LOCKER}`);
            log('info', `Intento ${attempt}: Request -> ${JSON.stringify(payload)}`);

            const response = await axios.post(API_ROUTES.ASSIGN_LOCKER, payload, { timeout: timeoutMs });

            log('info', `Response. Status: ${response.status}`);
            log('info', `Response. Data: ${JSON.stringify(response.data)}`);

            return {
                success: true,
                data: response.data,
                status: response.status,
            };

        } catch (error) {
            const status = error?.response?.status || 500;
            const msg = `Error HTTP: ${status} - ${error?.response?.data?.message || error.message}`;
            log('error', `[intento ${attempt}] ${msg}`);

            // Reintentar solo si el error es 500 y quedan intentos
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
};

export const paymentService = async (payload, timeoutMs, onTotalUpdate, onLoading) => {
    if (onLoading && typeof onLoading === 'function') {
        onLoading(false); // Apaga loading hasta que WS indique que terminó
    }

    log('info', `Timeout por parámetro: ${timeoutMs}`);

    const env = getEnv(); // 🔁 Actualiza si `.env` cambió
    const effectiveTimeout = timeoutMs ?? Number((env?.apiBaseTimeout * 1000) ?? 30000);

    log('info', `Timeout efectivo en ejecución: ${effectiveTimeout}`);

    try {
        log('info', 'Iniciando proceso de pago');

        await connectWebSocket();

        if (!isWebSocketConnected()) {
            const err = 'Error en la conexión con el WebSocket (001)';
            log('error', err);
            throw new Error(err);
        }

        let wsComplete = false;
        let httpResponse = null;

        const wsPromise = new Promise((resolve) => {
            onMessage((data) => {
                log('info', `Mensaje WebSocket recibido: ${JSON.stringify(data)}`);

                if (onTotalUpdate) {
                    onTotalUpdate(data.total);
                }

                if (data.complete === true) {
                    wsComplete = true;

                    if (onLoading && typeof onLoading === 'function') {
                        onLoading(true); // Enciende loading cuando WS indique que ya terminó
                    }

                    closeWebSocket();
                    resolve('WebSocket complete');
                }
            });
        });

        const httpPromise = AddAssignLocker(payload, effectiveTimeout)
            .then((res) => {
                httpResponse = res;

                if (!res.success) {
                    const err = res.data?.message || 'Error HTTP en servidor (002)';
                    log('error', err);
                    closeWebSocket();
                    throw new Error(err);
                }

                return 'HTTP complete';
            })
            .catch((err) => {
                log('error', `Error en HTTP: ${err.message}`);
                closeWebSocket();
                throw err;
            });

        const wsTimeout = new Promise((_, reject) =>
            setTimeout(() => {
                const err = 'Timeout en WebSocket (002)';
                log('error', err);
                reject(new Error(err));
            }, effectiveTimeout)
        );

        await Promise.race([
            Promise.all([wsPromise, httpPromise]),
            wsTimeout
        ]);

        log('info', 'Proceso completado exitosamente');

        return {
            websocket: wsComplete,
            http: httpResponse,
        };

    } catch (error) {
        log('error', `Error general: ${error.message}`);
        closeWebSocket();
        return {
            websocket: false,
            http: null,
            error: error.message || 'Error inesperado (003)',
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
