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
 * Observa y emite cambios en setup_config.json.
 * @param {string} configPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchSetupConfig(configPath, messenger = { send: () => { } }) {
    if (!configPath || !fs.existsSync(configPath)) {
        log.error(`[${fileName}] Archivo setup_config.json NO encontrado en: ${configPath || '(sin ruta)'}`);
        return;
    }

    const safeSend = (payload) => {
        try { messenger.send('config-updated', payload); }
        catch (e) { log.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
    };

    const loadAndSendConfig = () => {
        try {
            const updatedRaw = fs.readFileSync(configPath, 'utf8');
            const updatedConfig = JSON.parse(updatedRaw);

            log.info(`[${fileName}] setup_config.json actualizado`, { path: configPath });
            log.debug?.(
                `[${fileName}] setup_config.json (claves)`,
                { keys: Object.keys(updatedConfig || {}) }
            );

            safeSend(updatedConfig);
        } catch (err) {
            log.error(`[${fileName}] Error al cargar setup_config.json: ${err.message}`);
        }
    };

    log.info(`[${fileName}] Observando setup_config.json`, { path: configPath });
    loadAndSendConfig();

    // Debounce
    let timer = null;
    const trigger = () => {
        clearTimeout(timer);
        timer = setTimeout(loadAndSendConfig, 120);
    };

    try {
        fs.watch(configPath, (eventType) => {
            if (eventType === 'change') trigger();
        });
    } catch {
        log.warn(`[${fileName}] fs.watch falló, usando fs.watchFile`);
    }

    fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) trigger();
    });
}
