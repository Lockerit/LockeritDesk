import { useEffect, useState } from 'react';

const fileName = 'useLogger';

// Función auxiliar de log
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export function useElectronLogger() {
    const [logger, setLogger] = useState({});

    useEffect(() => {
        async function fetchLogger() {
            try {
                if (window?.electronAPI?.getLogger) {
                    const result = await window.electronAPI.getLogger();
                    setLogger(result);
                    log('info', 'Configuración inicial del logger obtenida');
                } else {
                    log('warn', 'getLogger no está disponible en electronAPI');
                }
            } catch (error) {
                log('error', `Error al obtener configuración inicial: ${error.message}`);
            }
        }

        fetchLogger();

        let unsubscribe;
        if (window?.electronAPI?.onLoggerUpdate) {
            unsubscribe = window.electronAPI.onLoggerUpdate((newLogger) => {
                setLogger(newLogger);
                log('info', 'Logger actualizado mediante onLoggerUpdate');
            });
        } else {
            log('warn', 'onLoggerUpdate no está disponible en electronAPI');
        }

        return () => {
            if (unsubscribe) {
                unsubscribe();
                log('info', 'onLoggerUpdate desuscrito en cleanup');
            }
        };
    }, []);

    return logger;
}
