// electron/watchers/setupWatcher.js  (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../logger/logger.js';

// __filename/__dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en setup_config.json.
 * @param {string} configPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchSetupConfig(configPath, messenger = { send: () => { } }) {
    if (!configPath || !fs.existsSync(configPath)) {
        logger.error(`[${fileName}] Archivo setup_config.json NO encontrado en: ${configPath}`);
        return;
    }

    const safeSend = (payload) => {
        try { messenger.send('config-updated', payload); }
        catch (e) { logger.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
    };

    const loadAndSendConfig = () => {
        try {
            const updatedRaw = fs.readFileSync(configPath, 'utf8');
            const updatedConfig = JSON.parse(updatedRaw);
            logger.debug?.(
                `[${fileName}] Contenido setup_config.json: ${JSON.stringify(updatedConfig)}`
            );
            safeSend(updatedConfig);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar setup_config.json: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando: ${configPath}`);
    loadAndSendConfig();

    // Debounce para múltiples eventos del SO por un solo cambio
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
        logger.warn(`[${fileName}] fs.watch falló, usando fs.watchFile`);
    }

    fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) trigger();
    });
}
