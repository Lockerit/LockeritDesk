// axiosConfig.js — configuración robusta y logging uniforme
import axios from 'axios';
import { getAuth, subscribeAuth } from '@shared/hooks/authStore.js';
import { getEnv, subscribeEnv } from '@shared/hooks/envStore.js';
import { logger } from '@shared/utils/logger.js';

const log = logger.scope('axios');

/** Normaliza baseURL a partir de host (con protocolo) + puerto opcional */
function buildBaseURL(env) {
    const host = (env?.apiBaseUrl || '').toString().trim().replace(/\/+$/, ''); // sin trailing slash
    const port = (env?.apiBasePort ?? '').toString().trim();

    if (!host) return 'http://localhost:8080';

    // Si host ya trae puerto (p. ej. http://10.0.0.5:9000), respeta y no agregues otro
    const hasPort = /^https?:\/\/[^/]+:\d+$/i.test(host);
    if (hasPort || !port) return host;

    // Agrega puerto cuando venga separado
    return `${host}:${port}`;
}

/** Timeout en ms. Tu .env trae segundos, default 30s */
function resolveTimeoutMs(env) {
    const sec = Number(env?.apiBaseTimeout);
    return Number.isFinite(sec) ? Math.max(0, sec) * 1000 : 30000;
}

// Configuración inicial
const initialEnv = getEnv();
const initialBaseURL = buildBaseURL(initialEnv);
const initialTimeout = resolveTimeoutMs(initialEnv);

log.info('init', { baseURL: initialBaseURL, timeoutMs: initialTimeout });

export const instanceAxios = axios.create({
    baseURL: initialBaseURL,
    timeout: initialTimeout,
    headers: { 'Content-Type': 'application/json' },
});

// ───────────────────────────────── Interceptors ─────────────────────────────────

// Request: token + métrica de tiempo
instanceAxios.interceptors.request.use(
    (config) => {
        const token = getAuth()?.key;
        if (token) {
            // Header por solicitud (asegura prioridad)
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Marcas para medir duración
        config.metadata = { startTs: Date.now(), url: config.url, method: config.method, baseURL: config.baseURL };
        log.debug?.('req', { method: config.method, url: config.url, timeout: config.timeout });
        return config;
    },
    (error) => {
        log.error('req.error', { message: error?.message || String(error) });
        return Promise.reject(error);
    }
);

// Response: éxito y errores
instanceAxios.interceptors.response.use(
    (response) => {
        const meta = response.config?.metadata;
        if (meta?.startTs) {
            const durMs = Date.now() - meta.startTs;
            log.debug?.('res', { status: response.status, method: meta.method, url: meta.url, durMs });
        } else {
            log.debug?.('res', { status: response.status, url: response.config?.url });
        }
        return response;
    },
    (error) => {
        const cfg = error?.config || {};
        const meta = cfg.metadata || {};
        const durMs = meta.startTs ? Date.now() - meta.startTs : undefined;

        // Detecta cancelaciones para no confundir con errores
        const isCanceled =
            axios.isCancel?.(error) || error?.name === 'CanceledError' || error?.code === 'ERR_CANCELED';

        if (isCanceled) {
            log.warn('res.cancelled', { method: meta.method, url: meta.url, durMs });
            return Promise.reject(error);
        }

        const status = error?.response?.status ?? null;
        const message = error?.response?.data?.message || error?.message || 'unknown';

        log.error('res.error', { status, method: meta.method, url: meta.url, durMs, message });
        return Promise.reject(error);
    }
);

// ─────────────────────────── Suscripciones dinámicas ───────────────────────────

// Cambios en .env → actualizan baseURL y timeout en caliente
subscribeEnv((env) => {
    const newBaseURL = buildBaseURL(env);
    if (newBaseURL !== instanceAxios.defaults.baseURL) {
        instanceAxios.defaults.baseURL = newBaseURL;
        log.info('env.baseURL.updated', { baseURL: newBaseURL });
    }

    const newTimeout = resolveTimeoutMs(env);
    if (newTimeout !== instanceAxios.defaults.timeout) {
        instanceAxios.defaults.timeout = newTimeout;
        log.info('env.timeout.updated', { timeoutMs: newTimeout });
    }
});

// Cambios en token → actualiza default header para nuevas requests
subscribeAuth((auth) => {
    const newToken = auth?.key;
    if (newToken) {
        instanceAxios.defaults.headers = instanceAxios.defaults.headers || {};
        instanceAxios.defaults.headers.Authorization = `Bearer ${newToken}`;
        log.debug?.('auth.token.set');
    } else {
        if (instanceAxios.defaults.headers) {
            delete instanceAxios.defaults.headers.Authorization;
        }
        log.warn('auth.token.cleared');
    }
});
