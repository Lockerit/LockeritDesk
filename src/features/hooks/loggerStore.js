let currentLogger = null;
const subscribers = [];

const fileName = 'loggerStore';

// Función auxiliar de log
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export function getLogger() {
    return currentLogger;
}

export function subscribeLogger(callback) {
    if (typeof callback === 'function') {
        subscribers.push(callback);
        if (currentLogger) callback(currentLogger);
        log('debug', 'Nuevo callback suscrito a cambios de logger');
    }
}

function setLogger(config) {
    currentLogger = config;
    log('info', 'Logger actualizado');
    log('debug', `Logger actualizado: ${JSON.stringify(config)}`);
    subscribers.forEach(cb => cb(currentLogger));
}

// Carga inicial
(async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.getLogger) {
        try {
            const config = await window.electronAPI.getLogger();
            log('info', 'Configuración inicial del logger obtenida correctamente');
            setLogger(config);
        } catch (error) {
            log('error', `Error al obtener config del logger: ${error.message}`);
        }
    } else {
        log('warn', 'No se puede obtener config del logger, no está en Electron');
    }

    // Escucha cambios en tiempo real
    if (typeof window !== 'undefined' && window.electronAPI?.onLoggerUpdate) {
        window.electronAPI.onLoggerUpdate((newConfig) => {
            log('info', 'Configuración del logger actualizada en tiempo real');
            setLogger(newConfig);
        });
    } else {
        log('warn', 'No se detectó handler onLoggerUpdate');
    }
})();
