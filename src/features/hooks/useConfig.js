import { useEffect, useState } from 'react';

const fileName = 'useConfig';

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export function useElectronConfig() {
    const [config, setConfig] = useState(null); // <-- cambia aquí

    useEffect(() => {
        async function fetchConfig() {
            try {
                if (window?.electronAPI?.getConfig) {
                    const result = await window.electronAPI.getConfig();
                    setConfig(result);
                    log('info', 'Configuración inicial obtenida');
                } else {
                    log('warn', 'getConfig no está disponible en electronAPI');
                }
            } catch (error) {
                log('error', `Error al obtener configuración inicial: ${error.message}`);
            }
        }

        fetchConfig();

        if (window?.electronAPI?.onConfigUpdate) {
            window.electronAPI.onConfigUpdate((newConfig) => {
                setConfig(newConfig);
                log('info', 'Configuración actualizada mediante onConfigUpdate');
            });
        } else {
            log('warn', 'onConfigUpdate no está disponible en electronAPI');
        }
    }, []);

    return config;
}
