let currentAuth = null;
const subscribers = [];

const fileName = 'authStore';

// Función auxiliar para loguear si está disponible
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export function getAuth() {
    return currentAuth;
}

export function subscribeAuth(callback) {
    if (typeof callback === 'function') {
        subscribers.push(callback);
        if (currentAuth) callback(currentAuth);
    }
}

export function setAuth(auth) {
    currentAuth = auth;
    log('info', 'Auth actualizado');
    subscribers.forEach(cb => cb(currentAuth));
}

// Solo si estamos dentro de Electron
if (typeof window !== 'undefined' && window.electronAPI?.onAuthUpdate) {
    window.electronAPI.onAuthUpdate((newAuth) => {
        setAuth(newAuth);
        log('info', 'Recibido nuevo auth vía IPC');
    });
} else {
    log('warn', 'electronAPI.onAuthUpdate no disponible: ejecutando en navegador');
}

// Inicializa si se puede
(async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.getAuth) {
        try {
            const initialAuth = await window.electronAPI.getAuth();
            setAuth(initialAuth);
            log('info', 'auth_key.json inicial cargado exitosamente');
        } catch (err) {
            log('error', `Error al cargar auth_key.json inicial: ${err.message}`);
        }
    } else {
        log('warn', 'No se puede cargar auth_key.json, no estamos en Electron');
    }
})();
