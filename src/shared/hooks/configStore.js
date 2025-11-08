// shared/hooks/configStore.js
import { logger as baseLogger } from '@shared/utils/logger';

let currentConfig = null;
const subscribers = new Set();

const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (baseLogger?.scope?.('configStore')) ?? NOOP;

const isObject = (v) => v !== null && typeof v === 'object';

const shallowEqual = (a, b) => {
    if (a === b) return true;
    if (!isObject(a) || !isObject(b)) return false;
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (a[k] !== b[k]) return false;
    return true;
};

export function getConfig() {
    return currentConfig;
}

export function subscribeConfig(callback) {
    if (typeof callback !== 'function') {
        log.warn('subscribe.ignored.nonFunction');
        return () => { };
    }
    subscribers.add(callback);
    if (currentConfig) {
        try { callback(currentConfig); } catch (e) {
            log.error(`subscribe.initial.notify.error, { message: ${e?.message} }`);
        }
    }
    return () => {
        subscribers.delete(callback);
    };
}

export function setConfig(config) {
    if (shallowEqual(currentConfig, config)) {
        log.debug('setConfig.nochange');
        return;
    }
    const prev = currentConfig;
    currentConfig = config;

    try {
        log.info(`setConfig.updated, {prev: ${JSON.stringify(prev)}, next: ${JSON.stringify(config)} }`);
    } catch (e) { log.error(`setConfig.updated, {prev: [object], next: [object]}, { message: ${e?.message} }`); }

    for (const cb of subscribers) {
        try { cb(currentConfig); } catch (e) {
            log.error(`subscriber.callback.error, { message: ${e?.message} }`);
        }
    }
}

// --- Bridge IPC idempotente ---
let ipcInitialized = false;
let ipcHandler = null;

export async function initConfigBridge() {
    if (ipcInitialized) return;
    ipcInitialized = true;

    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (!api) {
        log.warn('ipc.unavailable.window');
        return;
    }

    try {
        if (typeof api.getConfig === 'function') {
            const initialConfig = await api.getConfig();
            setConfig(initialConfig);
            log.info('ipc.initialConfig.loaded');
        } else {
            log.warn('ipc.getConfig.missing');
        }
    } catch (err) {
        log.error(`ipc.initialConfig.error, { message: ${err?.message} }`);
    }

    if (typeof api.onConfigUpdate === 'function') {
        ipcHandler = (newConfig) => {
            try { setConfig(newConfig); } catch (e) { log.error(`ipc.onConfigUpdate.error, { message: ${e?.message} }`); }
        };
        api.onConfigUpdate(ipcHandler);
        log.info('ipc.listener.attached');
    } else {
        log.warn('ipc.onConfigUpdate.missing');
    }
}

export function disposeConfigBridge() {
    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (api?.offConfigUpdate && ipcHandler) {
        try {
            api.offConfigUpdate(ipcHandler);
            log.info('ipc.listener.detached');
        } catch (e) { log.error(`ipc.offConfigUpdate.error, { message: ${e?.message} }`); }
    }
    ipcHandler = null;
    ipcInitialized = false;
}

// Auto-init best effort
(async () => { await initConfigBridge(); })();
