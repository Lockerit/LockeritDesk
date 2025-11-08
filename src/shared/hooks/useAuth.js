import { useEffect, useState } from 'react';

import { logger } from '@shared/utils/logger';

const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (logger?.scope?.('useElectronAuth')) ?? NOOP;

export function useElectronAuth() {
    const [auth, setAuth] = useState(null);

    useEffect(() => {
        let alive = true;
        let unsubscribe;

        async function fetchAuth() {
            try {
                if (window?.electronAPI?.getAuth) {
                    const result = await window.electronAPI.getAuth();
                    if (!alive) return;
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

        const api = window?.electronAPI;
        if (api?.onAuthUpdate) {
            unsubscribe = api.onAuthUpdate((newAuth) => {
                if (!alive) return;
                setAuth(newAuth);
                log.info('Autenticación actualizada mediante onAuthUpdate');
            });
        } else {
            log.warn('onAuthUpdate no está disponible en electronAPI');
        }

        return () => {
            alive = false;
            if (typeof unsubscribe === 'function') {
                unsubscribe();
                log.info('onAuthUpdate desuscrito en cleanup');
            }
        };
    }, []);

    return auth;
}
