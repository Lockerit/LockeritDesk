import { getEnv } from '../hooks/envStore.js';
import { getAuth } from '../hooks/authStore.js';

let socket = null;
let isConnected = false;
let wasConnectedOnce = false;
let shouldReconnect = true;

let messageListeners = [];

let reconnectAttempts = 0;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;

const fileName = 'websocket';

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

const connectWebSocket = () => {
    return new Promise((resolve, reject) => {
        const token = getAuth()?.key;

        if (!token) {
            const msg = 'Token no disponible';
            log('error', msg);
            return reject(new Error(`[WebSocket] ${msg}`));
        }

        const queryParams = new URLSearchParams({ token });
        const baseUrl = getEnv()?.wsBaseUrl || 'ws://localhost';
        const port = getEnv()?.wsBasePort || '3001';
        const path = getEnv()?.wsBasePath || '/ws/coinbox';
        const wsURL = `${baseUrl}:${port}${path}?${queryParams.toString()}`;

        log('info', `Conectando a WebSocket: ${baseUrl}:${port}`);

        socket = new WebSocket(wsURL);

        socket.onopen = () => {
            isConnected = true;
            wasConnectedOnce = true;
            reconnectAttempts = 0;
            log('info', 'WebSocket conectado exitosamente');
            resolve();
        };

        socket.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                messageListeners.forEach(cb => cb(data));
                log('debug', `Mensaje recibido: ${event.data}`);
            } catch (err) {
                log('warn', `Mensaje no válido: ${event.data}`);
            }
        };

        socket.onerror = (error) => {
            log('error', `Error en WebSocket: ${error.message || error}`);
            closeWebSocket();
            return reject(new Error('[WebSocket] Error desconocido'));
        };

        socket.onclose = () => {
            log('warn', 'Conexión cerrada');
            isConnected = false;

            if (shouldReconnect && wasConnectedOnce) {
                tryReconnect();
            }
        };
    });
};

const tryReconnect = () => {
    log('warn', 'Intentando reconectar...');

    if (reconnectAttempts >= maxReconnectAttempts) {
        log('error', `Se alcanzó el número máximo de intentos (${maxReconnectAttempts})`);
        closeWebSocket();
        return;
    }

    reconnectAttempts += 1;
    log('info', `Reintentando conexión (${reconnectAttempts}/${maxReconnectAttempts}) en ${reconnectDelay / 1000}s...`);

    setTimeout(() => {
        connectWebSocket().catch(err => {
            log('warn', `Reintento fallido: ${err.message}`);
        });
    }, reconnectDelay);
};

const closeWebSocket = () => {
    if (socket) {
        log('info', 'Cerrando conexión manualmente');
        shouldReconnect = false;
        socket.close();
        socket = null;
        isConnected = false;
        wasConnectedOnce = false;
        messageListeners = [];
        reconnectAttempts = 0;
    }
};

const sendMessage = (msg) => {
    if (socket && isConnected) {
        socket.send(JSON.stringify(msg));
        log('debug', `Mensaje enviado: ${JSON.stringify(msg)}`);
    } else {
        log('warn', 'No conectado, mensaje no enviado');
    }
};

const onMessage = (callback) => {
    if (typeof callback === 'function') {
        messageListeners.push(callback);
        log('debug', 'Callback agregado a messageListeners');
    }
};

const removeOnMessage = (callback) => {
    messageListeners = messageListeners.filter(cb => cb !== callback);
    log('debug', 'Callback removido de messageListeners');
};

const isWebSocketConnected = () => isConnected;

export {
    connectWebSocket,
    closeWebSocket,
    sendMessage,
    isWebSocketConnected,
    onMessage,
    removeOnMessage,
};
