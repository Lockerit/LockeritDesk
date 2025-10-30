// services/realtime/websocket.js
import { getAuth } from '@shared/hooks/authStore.js';
import { getEnv } from '@shared/hooks/envStore.js';
import { logger } from '@shared/utils/logger.js'; // opcional si ya lo tienes

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
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_MS = 1000;   // base para backoff
const MAX_RECONNECT_MS = 8000;    // límite superior

// Heartbeat (ping) — opcional
const HEARTBEAT_INTERVAL_MS = 15000;
const HEARTBEAT_TIMEOUT_MS = 5000;
let heartbeatTimer = null;
let heartbeatTimeout = null;

// ===== Helpers =====
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
    // exponencial con tope + jitter
    const expo = Math.min(MAX_RECONNECT_MS, BASE_RECONNECT_MS * (2 ** (attempt - 1)));
    const jitter = Math.floor(Math.random() * 250);
    return expo + jitter;
}

function clearHeartbeat() {
    if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null; }
    if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
}

function startHeartbeat() {
    clearHeartbeat();
    // envia "ping" y espera "pong" (o cualquier mensaje) para confirmar vida
    heartbeatTimer = setInterval(() => {
        try {
            if (!socket || socket.readyState !== WebSocket.OPEN) return;
            log.debug('heartbeat.ping');
            socket.send(JSON.stringify({ type: 'ping', ts: Date.now() }));
            // si no llega nada en X ms, cerramos para forzar reconexión
            heartbeatTimeout = setTimeout(() => {
                log.warn('heartbeat.timeout');
                socket.close(4000, 'heartbeat timeout');
            }, HEARTBEAT_TIMEOUT_MS);
        } catch (e) {
            log.warn('heartbeat.send.error', { msg: e?.message });
        }
    }, HEARTBEAT_INTERVAL_MS);
}

// ===== Core =====
export const connectWebSocket = () => {
    // idempotencia: si ya está OPEN devolvemos resuelta; si CONNECTING devuelve la misma promesa
    if (socket && socket.readyState === WebSocket.OPEN) {
        isConnected = true;
        return Promise.resolve();
    }
    if (connectingPromise) return connectingPromise;

    const url = buildWsURL();
    const token = getAuth()?.key;
    if (!token) {
        const msg = 'Token no disponible';
        log.error('auth.missing');
        return Promise.reject(new Error(`[WebSocket] ${msg}`));
    }

    shouldReconnect = true; // conectar implica permitir reconexión
    reconnectAttempts = 0;

    log.info('connect.start', { url });
    connectingPromise = new Promise((resolve, reject) => {
        try {
            // cierra socket previo si quedó en estado colgado
            if (socket && socket.readyState !== WebSocket.CLOSED) {
                socket.close(4001, 'reconnect:start');
            }

            socket = new WebSocket(url);

            const handleOpen = () => {
                isConnected = true;
                wasEverOpen = true;
                reconnectAttempts = 0;
                log.info('connect.open');
                startHeartbeat();
                cleanupConnHandlers(); // quita handlers de conexión
                resolve();
            };

            const handleError = (err) => {
                log.error('connect.error', { msg: err?.message });
                // dejamos que close maneje reconexión, pero rechazamos la 1ª conexión
            };

            const handleClose = (evt) => {
                isConnected = false;
                clearHeartbeat();
                log.warn('connect.close', { code: evt?.code, reason: evt?.reason });

                cleanupConnHandlers();

                // si estamos en 1ª conexión, rechazamos
                if (connectingPromise) {
                    const p = connectingPromise; // snapshot
                    connectingPromise = null;
                    if (!wasEverOpen) {
                        // 1ª vez y cerró sin abrir: rechazamos
                        reject(new Error('[WebSocket] no se pudo abrir conexión'));
                        if (shouldReconnect) scheduleReconnect();
                        return;
                    }
                    // si ya abrió alguna vez, resolvemos (para no colgar await) y dejamos reconexión
                    p.then(() => { }).catch(() => { });
                }

                if (shouldReconnect && wasEverOpen) scheduleReconnect();
            };

            const cleanupConnHandlers = () => {
                socket?.removeEventListener('open', handleOpen);
                socket?.removeEventListener('error', handleError);
                socket?.removeEventListener('close', handleClose);
                connectingPromise = null;
            };

            socket.addEventListener('open', handleOpen);
            socket.addEventListener('error', handleError);
            socket.addEventListener('close', handleClose);

            // canal principal de mensajes
            socket.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    // Cualquier mensaje “desarma” el heartbeat timeout
                    if (heartbeatTimeout) { clearTimeout(heartbeatTimeout); heartbeatTimeout = null; }
                    messageListeners.forEach((cb) => {
                        try { cb(data); } catch (e) { log.warn('listener.error', { msg: e?.message }); }
                    });
                    log.debug('message', { data });
                } catch (e) {
                    log.debug('error', { eventData: event.data, msg: e?.message });
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
    reconnectAttempts = 0;

    // no borres listeners del cliente aquí; solo el socket y sus handlers
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
        return () => removeOnMessage(callback); // devuelve unsubscribe
    }
    return () => { };
};

export const removeOnMessage = (callback) => {
    if (messageListeners.delete(callback)) {
        log.debug('listener.remove', { total: messageListeners.size });
    }
};

export const waitWebSocketReady = (timeout = 5000) => {
    // resuelve si ya está OPEN
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

// Utilidad: vaciar todos los listeners registrados por el cliente (no cierra el socket)
export const clearMessageListeners = () => {
    messageListeners.clear();
    log.debug('listener.clear');
};
