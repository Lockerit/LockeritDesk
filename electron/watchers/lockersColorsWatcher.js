// electron/watchers/setupWatcher.js  (ESM) — versión ajustada
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getLogger } from '../logger/logger.js';

// __filename/__dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.parse(__filename).name;
const log = getLogger(fileName);

/**
 * Observa y emite cambios en lockers_colors_config.json.
 * @param {string} lockersColorsPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchLockersColorsConfig(lockersColorsPath, messenger = { send: () => { } }) {
    if (!lockersColorsPath || !fs.existsSync(lockersColorsPath)) {
        log.error(`[${fileName}] Archivo lockers_colors_config.json NO encontrado en: ${lockersColorsPath || '(sin ruta)'}`);
        return;
    }

    const safeSend = (payload) => {
        try { messenger.send('lockers-colors-updated', payload); }
        catch (e) { log.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
    };

    const loadAndSendLockersColors = () => {
        try {
            const updatedRaw = fs.readFileSync(lockersColorsPath, 'utf8');
            const updatedLockersColors = JSON.parse(updatedRaw);

            log.info(`[${fileName}] lockers_colors_config.json actualizado`, { path: lockersColorsPath });
            log.debug?.(
                `[${fileName}] lockers_colors_config.json (claves)`,
                { keys: Object.keys(updatedLockersColors || {}) }
            );

            safeSend(updatedLockersColors);
        } catch (err) {
            log.error(`[${fileName}] Error al cargar lockers_colors_config.json: ${err.message}`);
        }
    };

    log.info(`[${fileName}] Observando lockers_colors_config.json`, { path: lockersColorsPath });
    loadAndSendLockersColors();

    // Debounce
    let timer = null;
    const trigger = () => {
        clearTimeout(timer);
        timer = setTimeout(loadAndSendLockersColors, 120);
    };

    try {
        fs.watch(lockersColorsPath, (eventType) => {
            if (eventType === 'change') trigger();
        });
    } catch {
        log.warn(`[${fileName}] fs.watch falló, usando fs.watchFile`);
    }

    fs.watchFile(lockersColorsPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) trigger();
    });
}
