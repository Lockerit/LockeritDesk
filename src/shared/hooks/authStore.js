// shared/hooks/authStore.js
import { logger as baseLogger } from '@shared/utils/logger';

// --- Logger seguro (no rompe si no existe) ---
const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (baseLogger?.scope?.('authStore')) ?? NOOP;

let currentAuth = null;
const subscribers = new Set();

let ipcAuthUpdateHandler = null;
let ipcInitialized = false;

// Redacción defensiva de campos sensibles
const redact = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const SENSITIVE = new Set(['key', 'token', 'secret', 'password', 'pass', 'authorization']);
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE.has(k.toLowerCase())) out[k] = v ? `${String(v).slice(0, 6)}…redacted` : v;
        else out[k] = v;
    }
    return out;
};

// Igualdad superficial con verificación explícita de 'key'
function shallowEqualAuth(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    if (a.key !== b.key) return false;               // clave crítica
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (a[k] !== b[k]) return false;
    return true;
}

export function getAuth() {
    return currentAuth; // rápido, sin copiar
}

// Versión inmutable por si un consumidor muta por error
export function getAuthSnapshot() {
    return currentAuth ? structuredClone(currentAuth) : null;
}

export function subscribeAuth(callback) {
    if (typeof callback !== 'function') return () => { };
    subscribers.add(callback);
    if (currentAuth) {
        try { callback(currentAuth); } catch (e) { log.warn('subscribe.callback.error', { error: e.message }); }
    }
    return () => { subscribers.delete(callback); };
}

export function setAuth(auth) {
    if (auth != null && typeof auth !== 'object') {
        log.warn('setAuth.invalid.type');
        return;
    }
    if (shallowEqualAuth(currentAuth ?? {}, auth ?? {})) {
        log.debug('setAuth.nochange');
        return;
    }

    const prev = currentAuth;
    currentAuth = auth ?? null;

    log.info('setAuth.updated', { prev: redact(prev), next: redact(currentAuth) });

    for (const cb of subscribers) {
        try { cb(currentAuth); } catch { log.warn('notify.callback.error'); }
    }
}

export async function initAuthBridge({ verbose = false } = {}) {
    if (ipcInitialized) {
        if (verbose) log.debug('ipc.alreadyInitialized');
        return;
    }
    ipcInitialized = true;

    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (!api) { log.warn('ipc.unavailable.window'); return; }

    try {
        if (typeof api.getAuth === 'function') {
            const initial = await api.getAuth();
            setAuth(initial);
            if (verbose) log.info('ipc.initial.loaded');
        } else log.warn('ipc.getAuth.missing');
    } catch (e) { log.error('ipc.initial.error', { error: e.message }); }

    if (typeof api.onAuthUpdate === 'function') {
        // Evita doble attach accidental
        if (!ipcAuthUpdateHandler) {
            ipcAuthUpdateHandler = (newAuth) => { setAuth(newAuth); };
            api.onAuthUpdate(ipcAuthUpdateHandler);
            if (verbose) log.info('ipc.listener.attached');
        }
    } else log.warn('ipc.onAuthUpdate.missing');
}

export function disposeAuthBridge() {
    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (api?.offAuthUpdate && ipcAuthUpdateHandler) {
        api.offAuthUpdate(ipcAuthUpdateHandler);
        log.info('ipc.listener.detached');
    }
    ipcAuthUpdateHandler = null;
    ipcInitialized = false;
}

export function resetAuthStore() {
    subscribers.clear();
    currentAuth = null;
    disposeAuthBridge();
}

// Auto-init no ruidoso
(async () => { await initAuthBridge(); })();
