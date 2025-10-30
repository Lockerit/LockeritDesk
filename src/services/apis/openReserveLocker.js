// openReserveLocker.js — POST abrir casillero reservado con reintentos y logging
import { API_ROUTES } from '@shared/constants/pathService.js';
import { getEnv } from '@shared/hooks/envStore.js';
import { logger } from '@shared/utils/logger.js';

import { instanceAxios } from './axiosConfig.js';

const log = logger.scope('openReserveLocker');

function timeoutMs(env) {
    const sec = Number(env?.apiBaseTimeout);
    return Number.isFinite(sec) ? Math.max(0, sec) * 1000 : 30000; // 30s por defecto
}
function retries(env) {
    const n = Number(env?.apiBaseMaxRetries);
    return Number.isFinite(n) ? Math.max(1, n) : 5; // 5 intentos por defecto
}
function retryDelayMs(env, attempt) {
    const base = Number(env?.apiBaseDelayRetries);
    const ms = (Number.isFinite(base) ? Math.max(0, base) : 1) * 1000; // 1s por defecto
    const jitter = Math.floor(Math.random() * 150);
    return attempt * ms + jitter; // backoff lineal + jitter
}

// Evita filtrar datos sensibles en logs
function redactPayload(payload) {
    try {
        const clone = { ...(payload || {}) };
        if ('pin' in clone) clone.pin = '***';
        if ('password' in clone) clone.password = '***';
        if ('confirmPassword' in clone) clone.confirmPassword = '***';
        return clone;
    } catch {
        return { type: typeof payload, note: 'payload not serializable' };
    }
}

export const OpenReserveLocker = async (payload) => {
    const env = getEnv(); // valores vivos del .env
    const effectiveTimeout = timeoutMs(env);
    const maxRetries = retries(env);
    const url = API_ROUTES.OPEN_RESERVE_LOCKER;

    log.info('start', {
        baseURL: instanceAxios.defaults.baseURL,
        url,
        timeoutMs: effectiveTimeout,
        maxRetries,
        payload: redactPayload(payload),
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log.debug?.('attempt', { attempt });
            const response = await instanceAxios.post(url, payload, { timeout: effectiveTimeout });

            log.info('success', { status: response.status, attempt });
            return {
                success: true,
                data: response.data,
                status: response.status,
            };
        } catch (error) {
            const status = error?.response?.status ?? null;
            const message = error?.response?.data?.message || error?.message || 'unknown';
            log.error('attempt.fail', { attempt, status, message });

            // Reintenta en 5xx, 429 o fallos de red (status null) si aún hay intentos
            const shouldRetry = (status === null || status >= 500 || status === 429) && attempt < maxRetries;
            if (shouldRetry) {
                const delay = retryDelayMs(env, attempt);
                log.warn('retry.sleep', { attempt, delayMs: delay });
                await new Promise((r) => setTimeout(r, delay));
                continue;
            }

            // No reintenta: devuelve error
            return {
                success: false,
                data: error?.response?.data || { message },
                status: status ?? 500,
            };
        }
    }
};
