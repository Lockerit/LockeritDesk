const fileName = 'envStore';

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

let currentEnv = null;
const subscribers = [];

export function getEnv() {
    return currentEnv;
}

export function subscribeEnv(callback) {
    if (typeof callback === 'function') {
        subscribers.push(callback);
        if (currentEnv) callback(currentEnv);
        log('debug', 'Nuevo callback suscrito a cambios de ENV');
    } else {
        log('warn', 'Intento de suscripción con un callback no válido');
    }
}

export function setEnv(env) {
    currentEnv = env;
    log('info', 'ENV actualizado');
    log('debug', `ENV actualizado: ${JSON.stringify(env)}`);
    subscribers.forEach(cb => cb(currentEnv));
}

// Evento en tiempo real
if (typeof window !== 'undefined' && window.electronAPI?.onEnvUpdate) {
    window.electronAPI.onEnvUpdate((newEnv) => {
        log('info', 'Recibido evento "onEnvUpdate" con nuevo ENV');
        setEnv(newEnv);
    });
} else {
    log('warn', 'electronAPI no disponible: ejecutando en navegador');
}

// Carga inicial
(async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.getEnv) {
        try {
            const initialEnv = await window.electronAPI.getEnv();
            log('info', 'ENV inicial cargado correctamente');
            setEnv(initialEnv);
        } catch (err) {
            log('error', `Error al cargar .env inicial: ${err.message}`);
        }
    } else {
        log('warn', 'No se puede cargar .env, no está en Electron');
    }
})();
