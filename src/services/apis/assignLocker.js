import { isWebSocketConnected, onMessage, sendMessage } from '@services/realtime/websocket.js';
import { API_ROUTES } from '@shared/constants/pathService.js';
import { getEnv, subscribeEnv } from '@shared/hooks/envStore.js';
import { cancelObservable } from '@shared/utils/cancelObservable.js';
import { logger } from '@shared/utils/logger.js';

import { instanceAxios } from './axiosConfig.js';

const log = logger.scope('assignLocker');

function resolveTimeoutMs(env, fallbackMs) {
    if (Number.isFinite(fallbackMs)) return Math.max(0, Number(fallbackMs));
    const sec = Number(env?.apiBaseTimeout);
    return Number.isFinite(sec) ? Math.max(0, sec) * 1000 : 30000;
}
function retries(env) {
    const n = Number(env?.apiBaseMaxRetries);
    return Number.isFinite(n) ? Math.max(1, n) : 5;
}
function retryDelayMs(env, attempt) {
    const base = Number(env?.apiBaseDelayRetries);
    const ms = (Number.isFinite(base) ? Math.max(0, base) : 1) * 1000;
    const jitter = Math.floor(Math.random() * 150);
    return attempt * ms + jitter;
}

export const assignLocker = async (payload, timeoutMs) => {
    const env = getEnv();

    // Defaults y normalización
    const effectiveTimeout = resolveTimeoutMs(env, timeoutMs);
    const maxRetries = retries(env);

    let abortController = new AbortController();
    cancelObservable.setCancel(false);

    const cancelListener = (e) => {
        if (e.detail) {
            sendMessage({ type: 'PAYMENT_CANCEL', phone: payload.phone || null });
            log.info('Operación cancelada por el usuario');
        }
    };

    cancelObservable.onCancel(cancelListener);

    log.info(`Petición AssignLocker, { uri: ${instanceAxios.getUri?.() || 'n/a'}, route: ${API_ROUTES.ASSIGN_LOCKER}, timeoutMs: ${effectiveTimeout}, maxRetries: ${maxRetries} }`);

    try {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                abortController = new AbortController();
                log.debug?.(`Reintento, { ${attempt} }`);

                const response = await instanceAxios.post(
                    API_ROUTES.ASSIGN_LOCKER,
                    payload,
                    { timeout: effectiveTimeout, signal: abortController.signal }
                );

                log.info(`Petición exitosa, { status: ${response.status} }`);
                return { success: true, data: response.data, status: response.status };

            } catch (error) {
                const status = error?.response?.status || 500;
                const message = error?.response?.data?.message || error?.message || 'unknown';
                log.error(`Petición fallida, { attempt: ${attempt}, status: ${status}, message: ${message} }`);

                // Reintenta solo para 500 y si hay intentos disponibles
                if (status === 500 && attempt < maxRetries) {
                    const delayMs = retryDelayMs(env, attempt);
                    log.warn(`Petición fallida, reintentando, { retryDelayMs: ${delayMs}, nextAttempt: ${attempt + 1} }`);
                    await new Promise((res) => setTimeout(res, delayMs));
                    continue;
                }

                // Falla definitiva
                return {
                    success: false,
                    data: error?.response?.data || { message: `HTTP ${status}: ${message}` },
                    status,
                };
            }
        }
    } finally {
        cancelObservable.removeEventListener('cancel', cancelListener);
    }
};

// Servicio principal: coordina WS + HTTP y publica totales en tiempo real
export const paymentService = async (payload, timeoutMs, onTotalUpdate, onLoading) => {
    let offMessage = null;
    try {
        onLoading?.(false);

        const env = getEnv();
        const effectiveTimeout = resolveTimeoutMs(env, timeoutMs);

        log.info(`Inicio Payment, { effectiveTimeout: ${effectiveTimeout} }`);

        // 1) Validar WS activo
        if (!isWebSocketConnected()) {
            log.warn('ws.not.connected');
            return { websocket: false, http: null, error: 'WebSocket not connected' };
        }

        let wsComplete = false;
        let httpResponse = null;

        const stopListening = () => {
            try { offMessage?.(); } catch (e) { log.debug?.('ws.off.error', { message: e?.message }); }
            offMessage = null;
        };

        // 3) Suscripción a mensajes
        offMessage = onMessage((data) => {
            try {
                log.debug?.('ws.message', data);

                if (data?.type === 'PAYMENT_UPDATE' && typeof data?.total !== 'undefined') {
                    onTotalUpdate?.(data.total);
                }
                if (data?.type === 'PAYMENT_COMPLETED') {
                    wsComplete = true;
                    onLoading?.(true);
                    log.info('ws.complete.flag');
                }
                if (data?.type === 'PAYMENT_CANCELED') {
                    onLoading?.(true);
                    log.info('ws.canceled.flag');
                }
            } catch (e) {
                log.error('ws.message.handler.error', { message: e?.message || String(e) });
            }
        });

        // 2) HTTP principal
        const httpPromise = assignLocker(payload, effectiveTimeout)
            .then((res) => {
                httpResponse = res;

                if (!res.success) {
                    const errMsg = res?.data?.message || 'HTTP server error (002)';
                    log.error('svc.payment.http.fail', { status: res.status, message: errMsg });
                }

                log.info('svc.payment.http.complete');
                stopListening();
                return res;
            })
            .catch((err) => {
                log.error(`svc.payment.http.exception, { message: ${err?.message || String(err)} }`);
                stopListening();
                throw err;
            });

        // 4) Espera respuesta HTTP (si llega antes de PAYMENT_COMPLETED, retorna HTTP)
        await httpPromise;

        log.info(`svc.payment.done, { wsComplete: ${wsComplete}, httpStatus: ${httpResponse?.status ?? null} }`);

        return { websocket: wsComplete, http: httpResponse };

    } catch (error) {
        log.error(`svc.payment.error, { message: ${error?.message || String(error)} }`);
        return { websocket: false, http: null, error: error?.message || 'Unexpected error (003)' };
    } finally {
        try { offMessage?.(); } catch (e) { log.debug?.('ws.off.finally.error', { message: e?.message }); }
    }
};

// Actualiza timeout base de Axios si cambia el .env
subscribeEnv((env) => {
    if (env?.apiBaseTimeout) {
        const newTimeout = Number(env.apiBaseTimeout);
        instanceAxios.defaults.timeout = newTimeout;
        log.info(`env.timeout.updated, { newTimeout: ${newTimeout} }`);
    }
});
