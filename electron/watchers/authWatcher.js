// electron/watchers/authWatcher.js  (ESM) — versión ajustada
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
 * Observa y emite cambios en auth_key.json.
 * @param {string} authPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchAuthKey(authPath, messenger = { send: () => { } }) {
    if (!authPath || !fs.existsSync(authPath)) {
        log.error(`[${fileName}] auth_key.json NO encontrado: ${authPath || '(sin ruta)'}`);
        return;
    }

    const safeSend = (payload) => {
        try { messenger.send('auth-updated', payload); }
        catch (e) { log.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
    };

    const redactAuth = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        const copy = { ...obj };
        for (const k of Object.keys(copy)) {
            const key = k.toLowerCase();
            if (['token', 'apikey', 'api_key', 'secret', 'password', 'pin'].includes(key)) {
                copy[k] = '***';
            }
        }
        return copy;
    };

    const loadAndSendAuth = () => {
        try {
            const raw = fs.readFileSync(authPath, 'utf8');
            const parsed = JSON.parse(raw);

            const redacted = redactAuth(parsed);
            log.info(`[${fileName}] auth_key.json actualizado`, { path: authPath });
            log.debug?.(
                `[${fileName}] auth_key.json (redactado)`,
                { keys: Object.keys(redacted) }
            );

            safeSend(parsed); // enviamos el objeto real a renderer (para uso funcional)
        } catch (err) {
            log.error(`[${fileName}] Error al leer/parsear auth_key.json: ${err.message}`);
        }
    };

    log.info(`[${fileName}] Observando auth_key.json`, { path: authPath });
    loadAndSendAuth();

    // Debounce
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
        log.warn(`[${fileName}] fs.watch falló: ${err.message}, usando fs.watchFile`);
    }

    fs.watchFile(authPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) trigger();
    });
}
