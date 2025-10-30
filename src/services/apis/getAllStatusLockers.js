// statusLockers.js — GET estado de casilleros con reintentos y logging uniforme
import { API_ROUTES } from '@shared/constants/pathService.js';
import { getEnv } from '@shared/hooks/envStore.js';
import { logger } from '@shared/utils/logger.js';

import { instanceAxios } from './axiosConfig.js';

const log = logger.scope('statusLockers');

function timeoutMs(env) {
    const sec = Number(env?.apiBaseTimeout);
    return Number.isFinite(sec) ? Math.max(0, sec) * 1000 : 30000; // 30s default
}
function retries(env) {
    const n = Number(env?.apiBaseMaxRetries);
    return Number.isFinite(n) ? Math.max(1, n) : 5; // 5 intentos default
}
function retryDelayMs(env, attempt) {
    const base = Number(env?.apiBaseDelayRetries);
    const ms = (Number.isFinite(base) ? Math.max(0, base) : 1) * 1000; // 1s default
    // backoff lineal + jitter pequeño
    const jitter = Math.floor(Math.random() * 150);
    return attempt * ms + jitter;
}

export const GetAllStatusLockers = async () => {
    const env = getEnv(); // valores vivos del .env
    const effectiveTimeout = timeoutMs(env);
    const maxRetries = retries(env);

    const url = API_ROUTES.GET_ALL_STATUS_LOCKERS;
    log.info('start', { baseURL: instanceAxios.defaults.baseURL, url, timeoutMs: effectiveTimeout, maxRetries });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log.debug?.('attempt', { attempt, url });
            const response = await instanceAxios.get(url, { timeout: effectiveTimeout });

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

            // Reintentar en 5xx y 429 si aún hay intentos
            const shouldRetry = (status === null || status >= 500 || status === 429) && attempt < maxRetries;
            if (shouldRetry) {
                const ms = retryDelayMs(env, attempt);
                log.warn('retry.sleep', { attempt, delayMs: ms });
                await new Promise((r) => setTimeout(r, ms));
                continue;
            }

            return {
                success: false,
                data: error?.response?.data || { message },
                status: status ?? 500,
            };
        }
    }
};
