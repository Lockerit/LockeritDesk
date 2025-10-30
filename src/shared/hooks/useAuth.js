import { useEffect, useState } from 'react';

import { logger } from '@shared/utils/logger';

const NOOP = Object.freeze({ info(){}, warn(){}, error(){}, debug(){} });
const log = (logger?.scope?.('useElectronAuth')) ?? NOOP;

export function useElectronAuth() {
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        async function fetchAuth() {
            try {
                if (window?.electronAPI?.getAuth) {
                    const result = await window.electronAPI.getAuth();
                    setAuth(result);
                    log.info('Autenticación inicial obtenida');
                } else {
                    log.warn('getAuth no está disponible en electronAPI');
                }
            } catch (error) {
                log.error(`Error al obtener autenticación: ${error.message}`);
            }
        }

        fetchAuth();

        if (window?.electronAPI?.onAuthUpdate) {
            window.electronAPI.onAuthUpdate((newAuth) => {
                setAuth(newAuth);
                log.info('Autenticación actualizada mediante onAuthUpdate');
            });
        } else {
            log.warn('onAuthUpdate no está disponible en electronAPI');
        }
    }, []);

    return auth;
}
