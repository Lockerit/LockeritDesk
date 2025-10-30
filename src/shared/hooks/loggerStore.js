// shared/hooks/loggerStore.js
import { logger as baseLogger } from '@shared/utils/logger';

let currentLogger = null;
const subscribers = new Set();

const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (baseLogger?.scope?.('loggerStore')) ?? NOOP;

// --- Utils ---
const isObject = (v) => v !== null && typeof v === 'object';
const shallowEqual = (a, b) => {
    if (a === b) return true;
    if (!isObject(a) || !isObject(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (a[k] !== b[k]) return false;
    return true;
};

// --- API pública ---
export function getLogger() {
    return currentLogger;
}

export function subscribeLogger(callback) {
    if (typeof callback !== 'function') {
        log.warn('subscribe.ignored.nonFunction');
        return () => { };
    }
    subscribers.add(callback);
    if (currentLogger) {
        try { callback(currentLogger); } catch { /* noop */ }
    }
    return () => subscribers.delete(callback);
}

export function setLogger(config) {
    if (shallowEqual(currentLogger ?? {}, config ?? {})) {
        log.debug('setLogger.nochange');
        return;
    }
    currentLogger = config ?? null;
    log.info('setLogger.updated');

    for (const cb of subscribers) {
        try { cb(currentLogger); } catch { /* noop */ }
    }
}

// --- Puente IPC (idempotente) ---
let ipcInited = false;
let ipcHandler = null;

export async function initLoggerBridge() {
    if (ipcInited) return;
    ipcInited = true;

    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (!api) {
        log.warn('ipc.unavailable.window');
        return;
    }

    // Carga inicial
    try {
        if (typeof api.getLogger === 'function') {
            const initial = await api.getLogger();
            setLogger(initial);
            log.info('ipc.initial.loaded');
        } else {
            log.warn('ipc.getLogger.missing');
        }
    } catch {
        log.error('ipc.initial.error');
    }

    // Suscripción en caliente
    if (typeof api.onLoggerUpdate === 'function') {
        ipcHandler = (newConfig) => {
            try { setLogger(newConfig); } catch { /* noop */ }
        };
        api.onLoggerUpdate(ipcHandler);
        log.info('ipc.listener.attached');
    } else {
        log.warn('ipc.onLoggerUpdate.missing');
    }
}

export function disposeLoggerBridge() {
    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (api?.offLoggerUpdate && ipcHandler) {
        try {
            api.offLoggerUpdate(ipcHandler);
            log.info('ipc.listener.detached');
        } catch { /* noop */ }
    }
    ipcHandler = null;
    ipcInited = false;
}

export function resetLoggerStore() {
    subscribers.clear();
    currentLogger = null;
    disposeLoggerBridge();
}

// Auto-init best effort
(async () => { try { await initLoggerBridge(); } catch { } })();
