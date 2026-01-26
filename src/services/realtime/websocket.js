// services/realtime/websocket.js
import { getAuth } from '@shared/hooks/authStore.js';
import { getEnv } from '@shared/hooks/envStore.js';
import { logger } from '@shared/utils/logger.js';

const log = logger?.scope?.('websocket') ?? {
    info: (...args) => console.info('[ws]', ...args),
    warn: (...args) => console.warn('[ws]', ...args),
    error: (...args) => console.error('[ws]', ...args),
    debug: () => { },
};

let socket = null;
let connectingPromise = null;

let isConnected = false;
let shouldReconnect = true;
let wasEverOpen = false;

const messageListeners = new Set();

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = Infinity;
const BASE_RECONNECT_MS = 1000;
const MAX_RECONNECT_MS = 8000;

// Watchdog de reconexión
const RECONNECT_WATCHDOG_MS = 3000;
let reconnectWatchdog = null;

// Heartbeat activado
const HEARTBEAT_INTERVAL_MS = 25000;
const HEARTBEAT_TIMEOUT_MS = 10000;
let heartbeatTimer = null;
let heartbeatTimeout = null;

function buildWsURL() {
    const env = getEnv() || {};
    const baseUrl = env.wsBaseUrl || 'ws://localhost';
    const port = env.wsBasePort || '3001';
    const path = env.wsBasePath || '/ws/coinbox';
    const token = getAuth()?.key;
    const qs = new URLSearchParams(token ? { token } : {});
    return `${baseUrl.replace(/\/$/, '')}:${String(port)}${path}?${qs.toString()}`;
}

function backoffDelayMs(attempt) {
    const expo = Math.min(MAX_RECONNECT_MS, BASE_RECONNECT_MS * (2 ** (attempt - 1)));
    const jitter = Math.floor(Math.random() * 250);
    return expo + jitter;
}

function clearHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
}

function startReconnectWatchdog() {
    if (reconnectWatchdog) return;
    reconnectWatchdog = setInterval(() => {
        if (!shouldReconnect) return;
        if (isConnected) return;
        if (connectingPromise) return;
        log.warn('reconnect.watchdog');
        scheduleReconnect();
    }, RECONNECT_WATCHDOG_MS);
}

function stopReconnectWatchdog() {
    if (reconnectWatchdog) { clearInterval(reconnectWatchdog); reconnectWatchdog = null; }
}

function startHeartbeat() {
    clearHeartbeat();
    heartbeatTimer = setInterval(() => {
        try {
            if (!socket || socket.readyState !== WebSocket.OPEN) {
                if (shouldReconnect) scheduleReconnect();
                return;
            }
            log.debug('heartbeat.ping');
            socket.send(JSON.stringify({ type: 'PING' }));
            if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); }
            heartbeatTimeout = setTimeout(() => {
                log.warn('heartbeat.timeout');
                try {
                    if (socket && socket.readyState === WebSocket.OPEN) {
                        socket.close(4003, 'heartbeat timeout');
                    }
                } catch (e) {
                    log.warn('heartbeat.close.error', { msg: e?.message });
                } finally {
                    isConnected = false;
                    socket = null;
                    if (shouldReconnect) scheduleReconnect();
                }
            }, HEARTBEAT_TIMEOUT_MS);
        } catch (e) {
            log.warn('heartbeat.send.error', { msg: e?.message });
            isConnected = false;
            socket = null;
            if (shouldReconnect) scheduleReconnect();
        }
    }, HEARTBEAT_INTERVAL_MS);
}

export const connectWebSocket = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        isConnected = true;
        return Promise.resolve();
    }
    if (connectingPromise) return connectingPromise;

    const url = buildWsURL();
    const token = getAuth()?.key;
    if (!token) {
        log.error('auth.missing');
        return Promise.reject(new Error('[WebSocket] Token no disponible'));
    }

    shouldReconnect = true;
    reconnectAttempts = 0;
    startReconnectWatchdog();

    log.info('connect.start', { url });
    connectingPromise = new Promise((resolve, reject) => {
        try {
            if (socket && socket.readyState !== WebSocket.CLOSED) {
                try { socket.close(4001, 'reconnect:start'); } catch (e) { log.warn('connect.close.error', { msg: e?.message }); }
            }

            socket = new WebSocket(url);

            const cleanupConnHandlers = () => {
                socket?.removeEventListener('open', handleOpen);
                socket?.removeEventListener('error', handleError);
                socket?.removeEventListener('close', handleClose);
                connectingPromise = null;
            };

            const handleOpen = () => {
                isConnected = true;
                wasEverOpen = true;
                reconnectAttempts = 0;
                log.info('connect.open');
                startHeartbeat();
                startReconnectWatchdog();
                try {
                    socket?.send(JSON.stringify({ type: 'CONNECT' }));
                    log.debug('connect.handshake.sent');
                } catch (e) {
                    log.warn('connect.handshake.error', { msg: e?.message });
                }
                cleanupConnHandlers();
                resolve();
            };

            const handleError = (err) => {
                log.error('connect.error', { msg: err?.message });
                // Si falla antes de abrir, liberar y reintentar
                if (socket && socket.readyState !== WebSocket.OPEN) {
                    socket = null;
                    cleanupConnHandlers();
                    if (!wasEverOpen) {
                        reject(new Error('[WebSocket] error de conexión'));
                    }
                    if (shouldReconnect) scheduleReconnect();
                }
            };

            const handleClose = (evt) => {
                isConnected = false;
                clearHeartbeat();
                log.warn('connect.close', { code: evt?.code, reason: evt?.reason });
                cleanupConnHandlers();
                socket = null;

                startReconnectWatchdog();

                if (connectingPromise) {
                    const p = connectingPromise;
                    connectingPromise = null;
                    if (!wasEverOpen) {
                        reject(new Error('[WebSocket] no se pudo abrir conexión'));
                        if (shouldReconnect) scheduleReconnect();
                        return;
                    }
                    p.then(() => { }).catch(() => { });
                }

                if (shouldReconnect && wasEverOpen) scheduleReconnect();
            };

            socket.addEventListener('open', handleOpen);
            socket.addEventListener('error', handleError);
            socket.addEventListener('close', handleClose);

            socket.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
                    messageListeners.forEach((cb) => {
                        try { cb(data); } catch (e) { log.warn('listener.error', { msg: e?.message }); }
                    });
                    log.debug('message', { data });
                } catch (e) {
                    log.info('message.raw', { raw: e.message });
                    log.warn('message.parse.error', { raw: event.data });
                }
            });
        } catch (e) {
            connectingPromise = null;
            log.error('connect.exception', { msg: e?.message });
            reject(e);
        }
    });

    return connectingPromise;
};

function scheduleReconnect() {
    if (!shouldReconnect) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        log.error('reconnect.max.reached', { attempts: reconnectAttempts });
        return;
    }
    reconnectAttempts += 1;
    const delay = backoffDelayMs(reconnectAttempts);
    log.warn('reconnect.scheduled', { attempt: reconnectAttempts, delay });

    setTimeout(() => {
        connectWebSocket().catch((err) => {
            log.warn('reconnect.fail', { msg: err?.message });
        });
    }, delay);
}

export const closeWebSocket = () => {
    shouldReconnect = false;
    clearHeartbeat();
    stopReconnectWatchdog();
    reconnectAttempts = 0;

    if (socket) {
        try {
            const state = socket.readyState;
            log.info('close.manual', { state });
            if (state === WebSocket.OPEN || state === WebSocket.CONNECTING) {
                socket.close(4002, 'manual close');
            }
        } catch (e) {
            log.warn('close.error', { msg: e?.message });
        } finally {
            socket = null;
            isConnected = false;
        }
    }
};

export const isWebSocketConnected = () => isConnected;

export const sendMessage = (msg) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
        try {
            socket.send(JSON.stringify(msg));
            log.debug('send', { msg });
        } catch (e) {
            log.warn('send.error', { msg: e?.message });
        }
    } else {
        log.warn('send.skip.notopen');
    }
};

export const onMessage = (callback) => {
    if (typeof callback === 'function') {
        messageListeners.add(callback);
        log.debug('listener.add', { total: messageListeners.size });
        return () => removeOnMessage(callback);
    }
    return () => { };
};

export const removeOnMessage = (callback) => {
    if (messageListeners.delete(callback)) {
        log.debug('listener.remove', { total: messageListeners.size });
    }
};

export const waitWebSocketReady = (timeout = 5000) => {
    if (socket && socket.readyState === WebSocket.OPEN) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const s = socket;
        if (!s) return reject(new Error('WebSocket no inicializado'));

        const timer = setTimeout(() => {
            cleanup();
            reject(new Error('WebSocket no se abrió a tiempo'));
        }, timeout);

        const onOpen = () => { cleanup(); resolve(); };
        const onError = (err) => { cleanup(); reject(err instanceof Error ? err : new Error('Error en WebSocket')); };
        const onClose = () => { cleanup(); reject(new Error('WebSocket se cerró antes de abrir')); };

        function cleanup() {
            clearTimeout(timer);
            s.removeEventListener('open', onOpen);
            s.removeEventListener('error', onError);
            s.removeEventListener('close', onClose);
        }

        s.addEventListener('open', onOpen);
        s.addEventListener('error', onError);
        s.addEventListener('close', onClose);
    });
};

export const clearMessageListeners = () => {
    messageListeners.clear();
    log.debug('listener.clear');
};
