import { useEffect, useState } from 'react';

import { logger } from '@shared/utils/logger';

const NOOP = Object.freeze({ info() { }, warn() { }, error() { }, debug() { } });
const log = (logger?.scope?.('useElectronLockersColors')) ?? NOOP;

export function useElectronLockersColors() {
    const [lockersColors, setLockersColors] = useState(null);

    useEffect(() => {
        let alive = true;
        let unsubscribe;

        async function fetchLockersColors() {
            try {
                if (window?.electronAPI?.getLockersColors) {
                    const result = await window.electronAPI.getLockersColors();
                    if (!alive) return;
                    setLockersColors(result);
                    log.info('LockersColors inicial obtenida');
                } else {
                    log.warn('getLockersColors no está disponible en electronAPI');
                }
            } catch (error) {
                log.error(`Error al obtener LockersColors inicial: ${error.message}`);
            }
        }

        fetchLockersColors();

        const api = window?.electronAPI;
        if (api?.onLockersColorsUpdate) {
            unsubscribe = api.onLockersColorsUpdate((newLockersColors) => {
                if (!alive) return;
                setLockersColors(newLockersColors);
                log.info('LockersColors actualizada mediante onLockersColorsUpdate');
            });
        } else {
            log.warn('onLockersColorsUpdate no está disponible en electronAPI');
        }

        return () => {
            alive = false;
            if (typeof unsubscribe === 'function') {
                unsubscribe();
                log.info('onLockersColorsUpdate desuscrito en cleanup');
            }
        };
    }, []);

    return lockersColors;
}
