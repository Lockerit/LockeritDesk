// electron/watchers/authWatcher.js  (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import logger from '../logger/logger.js';

// __filename/__dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en auth_key.json.
 * @param {string} authPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchAuthKey(authPath, messenger = { send: () => { } }) {
    if (!authPath || !fs.existsSync(authPath)) {
        logger.error(`[${fileName}] auth_key.json NO encontrado: ${authPath}`);
        return;
    }

    const safeSend = (payload) => {
        try { messenger.send('auth-updated', payload); }
        catch (e) { logger.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
    };

    const loadAndSendAuth = () => {
        try {
            const raw = fs.readFileSync(authPath, 'utf8');
            const parsed = JSON.parse(raw);
            logger.debug?.(`[${fileName}] auth_key.json: ${raw}`);
            safeSend(parsed);
        } catch (err) {
            logger.error(`[${fileName}] Error al leer/parsear auth_key.json: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando: ${authPath}`);
    loadAndSendAuth();

    // Debounce para evitar múltiples emisiones por un solo cambio
    let timer = null;
    const trigger = () => {
        clearTimeout(timer);
        timer = setTimeout(loadAndSendAuth, 120);
    };

    try {
        fs.watch(authPath, (eventType) => {
            if (eventType === 'change') trigger();
        });
    } catch (err) {
        logger.warn(`[${fileName}] fs.watch falló: ${err.message}, usando fs.watchFile`);
    }

    fs.watchFile(authPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) trigger();
    });
}
