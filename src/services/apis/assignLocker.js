import { connectWebSocket, closeWebSocket, isWebSocketConnected, onMessage, waitWebSocketReady } from '@services/realtime/websocket.js';
import { API_ROUTES } from '@shared/constants/pathService.js';
import { getEnv, subscribeEnv } from '@shared/hooks/envStore.js';
import { cancelObservable } from '@shared/utils/cancelObservable.js';
import { logger } from '@shared/utils/logger.js';

import { instanceAxios } from './axiosConfig.js';

const fileName = 'assignLocker';
const log = logger.scope(fileName);

let _abortCancel = null; // control de cancelación local

export const assignLocker = async (payload, timeoutMs) => {
    const env = getEnv();

    // Defaults y normalización
    const maxRetries = Number(env?.apiBaseMaxRetries ?? 5);
    const retryDelayMs = Number(env?.apiBaseDelayRetries ?? 1) * 1000;

    _abortCancel = false;

    let cancelled = false;
    let abortController = new AbortController();
    cancelObservable.setCancel(false);

    const cancelListener = (e) => {
        if (e.detail) {
            cancelled = true;
            abortController.abort();
            log.info('http.cancel.requested');
        }
    };
    cancelObservable.onCancel(cancelListener);

    log.info('http.assign.start', {
        uri: instanceAxios.getUri?.() || 'n/a',
        route: API_ROUTES.ASSIGN_LOCKER,
        timeoutMs,
        maxRetries,
        retryDelayMs,
    });

    try {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            if (cancelled) {
                _abortCancel = true;
                log.warn('http.assign.canceled', { attempt });
                cancelObservable.setCancel(false);
                return { success: false, data: '', status: 499 };
            }

            try {
                abortController = new AbortController();
                log.debug?.('http.assign.try', { attempt });

                const response = await instanceAxios.post(
                    API_ROUTES.ASSIGN_LOCKER,
                    payload,
                    { timeout: timeoutMs, signal: abortController.signal }
                );

                log.info('http.assign.ok', { status: response.status });
                return { success: true, data: response.data, status: response.status };

            } catch (error) {
                // Petición cancelada
                if (instanceAxios.isCancel?.(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED') {
                    _abortCancel = true;
                    log.warn('http.assign.cancelled.byUser', { attempt });
                    return { success: false, data: '', status: 499 };
                }

                const status = error?.response?.status || 500;
                const message = error?.response?.data?.message || error?.message || 'unknown';
                log.error('http.assign.error', { attempt, status, message });

                // Reintenta solo para 500 y si hay intentos disponibles
                if (status === 500 && attempt < maxRetries) {
                    log.warn('http.assign.retry.delay', { retryDelayMs, nextAttempt: attempt + 1 });
                    await new Promise((res) => setTimeout(res, retryDelayMs));
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
    try {
        onLoading?.(false);

        const env = getEnv();
        const effectiveTimeout =
            timeoutMs ?? ((env?.apiBaseTimeout ? Number(env.apiBaseTimeout) * 1000 : 30000));

        log.info('svc.payment.start', { effectiveTimeout });

        // Si ya hay WS abierto, ciérralo primero
        if (isWebSocketConnected()) {
            log.warn('ws.preexisting.close');
            closeWebSocket();
            await new Promise((r) => setTimeout(r, 200));
        }

        // 1) Conexión WS
        await connectWebSocket();
        log.info('ws.connected');

        // 2) Espera a readyState=OPEN estable
        await waitWebSocketReady(5000);
        log.info('ws.ready');

        let wsComplete = false;
        let httpResponse = null;

        // 3) Suscripción a mensajes
        onMessage((data) => {
            try {
                log.debug?.('ws.message', data);

                if (typeof data?.total !== 'undefined') {
                    onTotalUpdate?.(data.total);
                }
                if (data?.complete === true) {
                    wsComplete = true;
                    onLoading?.(true);
                    log.info('ws.complete.flag');
                }
            } catch (e) {
                log.error('ws.message.handler.error', { message: e?.message || String(e) });
            }
        });

        // 4) HTTP principal
        const httpPromise = assignLocker(payload, effectiveTimeout)
            .then((res) => {
                httpResponse = res;

                if (!res.success) {
                    if (res.status === 499) {
                        log.warn('svc.payment.http.499.cancelled');
                        closeWebSocket();
                        return res;
                    }
                    const errMsg = res?.data?.message || 'HTTP server error (002)';
                    log.error('svc.payment.http.fail', { status: res.status, message: errMsg });
                    closeWebSocket();
                }

                wsComplete = true; // consideramos el flujo completo si HTTP respondió
                closeWebSocket();
                log.info('svc.payment.http.complete');
                return 'HTTP complete';
            })
            .catch((err) => {
                log.error('svc.payment.http.exception', { message: err?.message || String(err) });
                closeWebSocket();
                throw err;
            });

        // 5) Timeout explícito del HTTP
        const httpTimeout = new Promise((_, reject) =>
            setTimeout(() => {
                const msg = 'HTTP timeout (002)';
                log.error('svc.payment.http.timeout', { effectiveTimeout });
                closeWebSocket();
                reject(new Error(msg));
            }, effectiveTimeout)
        );

        await Promise.race([httpPromise, httpTimeout]);

        closeWebSocket();
        log.info('svc.payment.done', { wsComplete, httpStatus: httpResponse?.status ?? null });

        return { websocket: wsComplete, http: httpResponse };

    } catch (error) {
        log.error('svc.payment.error', { message: error?.message || String(error) });
        closeWebSocket();
        return { websocket: false, http: null, error: error?.message || 'Unexpected error (003)' };
    }
};

// Actualiza timeout base de Axios si cambia el .env
subscribeEnv((env) => {
    if (env?.apiBaseTimeout) {
        const newTimeout = Number(env.apiBaseTimeout);
        instanceAxios.defaults.timeout = newTimeout;
        log.info('env.timeout.updated', { newTimeout });
    }
});
