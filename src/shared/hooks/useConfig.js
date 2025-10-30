import { useEffect, useState } from 'react';

import { logger } from '@shared/utils/logger';

const NOOP = Object.freeze({ info(){}, warn(){}, error(){}, debug(){} });
const log = (logger?.scope?.('useElectronConfig')) ?? NOOP;

export function useElectronConfig() {
    const [config, setConfig] = useState(null); // <-- cambia aquí

    useEffect(() => {
        async function fetchConfig() {
            try {
                if (window?.electronAPI?.getConfig) {
                    const result = await window.electronAPI.getConfig();
                    setConfig(result);
                    log.info('Configuración inicial obtenida');
                } else {
                    log.warn('getConfig no está disponible en electronAPI');
                }
            } catch (error) {
                log.error(`Error al obtener configuración inicial: ${error.message}`);
            }
        }

        fetchConfig();

        if (window?.electronAPI?.onConfigUpdate) {
            window.electronAPI.onConfigUpdate((newConfig) => {
                setConfig(newConfig);
                log.info('Configuración actualizada mediante onConfigUpdate');
            });
        } else {
            log.warn('onConfigUpdate no está disponible en electronAPI');
        }
    }, []);

    return config;
}
