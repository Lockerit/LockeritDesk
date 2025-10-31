// shared/hooks/envStore.js
import { logger as baseLogger } from '@shared/utils/logger';

let currentEnv = null;
const subscribers = new Set();

const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (baseLogger?.scope?.('envStore')) ?? NOOP;

// Utilidades
const isObject = (v) => v !== null && typeof v === 'object';
const shallowEqual = (a, b) => {
    if (a === b) return true;
    if (!isObject(a) || !isObject(b)) return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (a[k] !== b[k]) return false;
    return true;
};
const _redactEnv = (env) => {
    if (!isObject(env)) return env;
    const SENSITIVE = new Set(['key', 'token', 'secret', 'password', 'pass', 'authorization', 'bearer', 'apikey', 'api_key']);
    const out = {};
    for (const [k, v] of Object.entries(env)) {
        if (SENSITIVE.has(String(k).toLowerCase())) {
            out[k] = v ? `${String(v).slice(0, 6)}…redacted` : v;
        } else if (isObject(v)) {
            out[k] = _redactEnv(v);
        } else {
            out[k] = v;
        }
    }
    return out;
};

// API
export function getEnv() {
    return currentEnv;
}

export function subscribeEnv(callback) {
    if (typeof callback !== 'function') {
        log.warn('subscribe.ignored.nonFunction');
        return () => { };
    }
    subscribers.add(callback);
    if (currentEnv) {
        try { callback(currentEnv); } catch (e) { log.warn(`subscribe.callback.error, { error: ${e.message} }`); }
    }
    return () => subscribers.delete(callback);
}

export function setEnv(env) {
    if (shallowEqual(currentEnv ?? {}, env ?? {})) {
        log.debug('setEnv.nochange');
        return;
    }
    const prev = currentEnv;
    currentEnv = env ?? null;

    log.info(`setEnv.updated, { prev: ${JSON.stringify(prev)}, next: ${JSON.stringify(currentEnv)} }`);

    for (const cb of subscribers) {
        try { cb(currentEnv); } catch (e) { log.warn(`notify.callback.error, { error: ${e.message} }`); }
    }
}

// Puente IPC (idempotente)
let ipcInited = false;
let ipcHandler = null;

export async function initEnvBridge() {
    if (ipcInited) return;
    ipcInited = true;

    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (!api) {
        log.warn('ipc.unavailable.window');
        return;
    }

    try {
        if (typeof api.getEnv === 'function') {
            const initial = await api.getEnv();
            setEnv(initial);
            log.info('ipc.initial.loaded');
        } else {
            log.warn('ipc.getEnv.missing');
        }
    } catch (e) {
        log.error(`ipc.initial.error, { error: ${e.message} }`);
    }

    if (typeof api.onEnvUpdate === 'function') {
        ipcHandler = (newEnv) => {
            setEnv(newEnv);
        };
        api.onEnvUpdate(ipcHandler);
        log.info('ipc.listener.attached');
    } else {
        log.warn('ipc.onEnvUpdate.missing');
    }
}

export function disposeEnvBridge() {
    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (api?.offEnvUpdate && ipcHandler) {
        api.offEnvUpdate(ipcHandler);
        log.info('ipc.listener.detached');
    }
    ipcHandler = null;
    ipcInited = false;
}

export function resetEnvStore() {
    subscribers.clear();
    currentEnv = null;
    disposeEnvBridge();
}

// Auto-init best-effort
(async () => {
   await initEnvBridge();
})();
