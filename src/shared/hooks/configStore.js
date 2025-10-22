let currentConfig = null;
const subscribers = [];

const fileName = 'configStore';

// Función auxiliar para loguear
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export function getConfig() {
    return currentConfig;
}

export function subscribeConfig(callback) {
    if (typeof callback === 'function') {
        subscribers.push(callback);
        if (currentConfig) callback(currentConfig);
    }
}

export function setConfig(config) {
    currentConfig = config;
    log('info', 'Configuración actualizada');
    subscribers.forEach(cb => cb(currentConfig));
}

// Solo si estamos dentro de Electron
if (typeof window !== 'undefined' && window.electronAPI?.onConfigUpdate) {
    window.electronAPI.onConfigUpdate((newConfig) => {
        setConfig(newConfig);
        log('info', 'Nueva configuración recibida vía IPC');
    });
} else {
    log('warn', 'electronAPI.onConfigUpdate no disponible: ejecutando en navegador');
}

// Inicializa si se puede
(async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.getConfig) {
        try {
            const initialConfig = await window.electronAPI.getConfig();
            setConfig(initialConfig);
            log('info', 'config_key.json inicial cargado exitosamente');
        } catch (err) {
            log('error', `Error al cargar config_key.json inicial: ${err.message}`);
        }
    } else {
        log('warn', 'No se puede cargar config_key.json, no estamos en Electron');
    }
})();
