import { useEffect, useState } from 'react';

const fileName = 'useEnv';

// Función auxiliar de log
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export function useElectronEnv() {
    const [env, setEnv] = useState(null);

    useEffect(() => {
        async function fetchEnv() {
            try {
                if (window?.electronAPI?.getEnv) {
                    const envVars = await window.electronAPI.getEnv();
                    setEnv(envVars);
                    log('info', 'Variables de entorno iniciales obtenidas');
                } else {
                    log('warn', 'getEnv no está disponible en electronAPI');
                }
            } catch (err) {
                log('error', `Error al obtener .env: ${err.message}`);
            }
        }

        fetchEnv();

        let unsubscribe;
        if (window?.electronAPI?.onEnvUpdate) {
            unsubscribe = window.electronAPI.onEnvUpdate((newEnv) => {
                setEnv(newEnv);
                log('info', 'Variables de entorno actualizadas mediante onEnvUpdate');
            });
        } else {
            log('warn', 'onEnvUpdate no está disponible en electronAPI');
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
                log('info', 'onEnvUpdate desuscrito en cleanup');
            }
        };
    }, []);

    return env;
}
