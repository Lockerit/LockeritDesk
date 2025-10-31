import { logger as baseLogger } from '@shared/utils/logger';

let currentConfig = null;
const subscribers = new Set();

// --- Logger seguro (no rompe si no existe) ---
const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (baseLogger?.scope?.('configStore')) ?? NOOP;

// --- Utilidades ---
const isObject = (v) => v !== null && typeof v === 'object';

// Comparación superficial de primer nivel para evitar notificar sin cambios
const shallowEqual = (a, b) => {
    if (a === b) return true;
    if (!isObject(a) || !isObject(b)) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
        if (a[k] !== b[k]) return false;
    }
    return true;
};

// Redacción básica de campos sensibles
const redactConfig = (cfg) => {
    if (!isObject(cfg)) return cfg;
    const SENSITIVE_KEYS = new Set([
        'key', 'token', 'secret', 'password', 'pass', 'authorization',
    ]);
    const out = {};
    for (const [k, v] of Object.entries(cfg)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase())) {
            out[k] = v ? `${String(v).slice(0, 6)}…redacted` : v;
        } else if (isObject(v)) {
            out[k] = redactConfig(v);
        } else {
            out[k] = v;
        }
    }
    return out;
};

// --- API pública ---
export function getConfig() {
    return currentConfig;
}

export function subscribeConfig(callback) {
    if (typeof callback !== 'function') {
        log.warn('subscribe.ignored.nonFunction');
        return () => { };
    }
    subscribers.add(callback);
    // Notificación inicial (si ya hay config)
    if (currentConfig) {
        try {
            callback(currentConfig);
        } catch (e) {
            log.error(`subscribe.initial.notify.error, { message: ${e?.message} }`);
        }
    }
    // Retorna unsubscribe
    return () => {
        subscribers.delete(callback);
    };
}

export function setConfig(config) {
    // Evita notificar si no hay cambios de primer nivel
    if (shallowEqual(currentConfig, config)) {
        log.debug('setConfig.nochange');
        return;
    }

    const prev = currentConfig;
    currentConfig = config;

    // Logs de cambio (redactado)
    try {
        log.info(`setConfig.updated, {prev: ${JSON.stringify(prev)}, next: ${JSON.stringify(config)} }`);
    } catch {
        // Ignorar errores de serialización
    }

    // Notificar a suscriptores de forma segura
    for (const cb of subscribers) {
        try {
            cb(currentConfig);
        } catch (e) {
            log.error(`subscriber.callback.error, { message: ${e?.message} }`);
        }
    }
}

// --- Integración con Electron (si existe) ---
const hasElectron = typeof window !== 'undefined' && !!window.electronAPI;

if (hasElectron && window.electronAPI?.onConfigUpdate) {
    try {
        window.electronAPI.onConfigUpdate((newConfig) => {
            setConfig(newConfig);
            log.debug('ipc.onConfigUpdate.received');
        });
        log.info(`ipc.listener.attached`);
    } catch (e) {
        log.error(`ipc.listener.attach.error, { message: ${e?.message} }`);
    }
} else {
    log.warn('ipc.listener.unavailable');
}

// Carga inicial (best-effort)
(async () => {
    if (hasElectron && window.electronAPI?.getConfig) {
        try {
            const initialConfig = await window.electronAPI.getConfig();
            setConfig(initialConfig);
            log.info('ipc.initialConfig.loaded');
        } catch (err) {
            log.error(`ipc.initialConfig.error, { message: ${err?.message} }`);
        }
    } else {
        log.warn('ipc.initialConfig.unavailable');
    }
})();
