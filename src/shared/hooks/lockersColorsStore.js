// shared/hooks/lockersColorsStore.js
import { logger as baseLogger } from '@shared/utils/logger';

let currentLockersColors = null;
const subscribers = new Set();

const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (baseLogger?.scope?.('lockersColorsStore')) ?? NOOP;

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

export function getLockersColors() {
    return currentLockersColors;
}

export function subscribeLockersColors(callback) {
    if (typeof callback !== 'function') {
        log.warn('subscribe.ignored.nonFunction');
        return () => { };
    }
    subscribers.add(callback);
    if (currentLockersColors) {
        try { callback(currentLockersColors); } catch (e) {
            log.error(`subscribe.initial.notify.error, { message: ${e?.message} }`);
        }
    }
    return () => {
        subscribers.delete(callback);
    };
}

export function setLockersColors(LockersColors) {
    if (shallowEqual(currentLockersColors, LockersColors)) {
        log.debug('setLockersColors.nochange');
        return;
    }
    const prev = currentLockersColors;
    currentLockersColors = LockersColors;

    try {
        log.info(`setLockersColors.updated, {prev: ${JSON.stringify(prev)}, next: ${JSON.stringify(LockersColors)} }`);
    } catch (e) { log.error(`setLockersColors.updated, {prev: [object], next: [object]}, { message: ${e?.message} }`); }

    for (const cb of subscribers) {
        try { cb(currentLockersColors); } catch (e) {
            log.error(`subscriber.callback.error, { message: ${e?.message} }`);
        }
    }
}

// --- Bridge IPC idempotente ---
let ipcInitialized = false;
let ipcHandler = null;

export async function initLockersColorsBridge() {
    if (ipcInitialized) return;
    ipcInitialized = true;

    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (!api) {
        log.warn('ipc.unavailable.window');
        return;
    }

    try {
        if (typeof api.getLockersColors === 'function') {
            const initialLockersColors = await api.getLockersColors();
            setLockersColors(initialLockersColors);
            log.info('ipc.initialLockersColors.loaded');
        } else {
            log.warn('ipc.getLockersColors.missing');
        }
    } catch (err) {
        log.error(`ipc.initialLockersColors.error, { message: ${err?.message} }`);
    }

    if (typeof api.onLockersColorsUpdate === 'function') {
        ipcHandler = (newLockersColors) => {
            try { setLockersColors(newLockersColors); } catch (e) { log.error(`ipc.onLockersColorsUpdate.error, { message: ${e?.message} }`); }
        };
        api.onLockersColorsUpdate(ipcHandler);
        log.info('ipc.listener.attached');
    } else {
        log.warn('ipc.onLockersColorsUpdate.missing');
    }
}

export function disposeLockersColorsBridge() {
    const api = typeof window !== 'undefined' ? window.electronAPI : null;
    if (api?.offLockersColorsUpdate && ipcHandler) {
        try {
            api.offLockersColorsUpdate(ipcHandler);
            log.info('ipc.listener.detached');
        } catch (e) { log.error(`ipc.offLockersColorsUpdate.error, { message: ${e?.message} }`); }
    }
    ipcHandler = null;
    ipcInitialized = false;
}

// Auto-init best effort
(async () => { await initLockersColorsBridge(); })();
