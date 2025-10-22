// electron/watchers/envWatcher.js  (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import logger from '../logger/logger.js';

// __filename/__dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en .env.
 * @param {string} envPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchEnvFile(envPath, messenger = { send: () => { } }) {
    if (!envPath || !fs.existsSync(envPath)) {
        logger.error(`[${fileName}] Archivo .env NO encontrado en: ${envPath}`);
        return;
    }

    const safeSend = (payload) => {
        try { messenger.send('env-updated', payload); }
        catch (e) { logger.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
    };

    const loadAndSendEnv = () => {
        try {
            const updatedEnvRaw = fs.readFileSync(envPath);
            const parsedEnv = dotenv.parse(updatedEnvRaw);

            const updatedEnv = {
                apiBaseUrl: parsedEnv.REACT_APP_API_BASE_URL,
                apiBasePort: parsedEnv.REACT_APP_API_BASE_PORT,
                apiBaseTimeout: parsedEnv.REACT_APP_API_BASE_TIMEOUT,
                apiBaseMaxRetries: parsedEnv.REACT_APP_API_BASE_MAXRETRIES,
                apiBaseDelayRetries: parsedEnv.REACT_APP_API_BASE_DELAYRETRIES,
                wsBaseUrl: parsedEnv.REACT_APP_WS_URL,
                wsBasePort: parsedEnv.REACT_APP_WS_PORT,
                wsBasePath: parsedEnv.REACT_APP_WS_PATH,
            };

            logger.debug?.(`[${fileName}] .env parseado: ${JSON.stringify(updatedEnv)}`);
            safeSend(updatedEnv);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar/parsear .env: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando: ${envPath}`);
    loadAndSendEnv();

    // Debounce para múltiples eventos de cambio
    let timer = null;
    const trigger = () => {
        clearTimeout(timer);
        timer = setTimeout(loadAndSendEnv, 120);
    };

    try {
        fs.watch(envPath, (eventType) => {
            if (eventType === 'change') trigger();
        });
    } catch (err) {
        logger.warn(`[${fileName}] fs.watch falló: ${err.message}, usando fs.watchFile`);
    }

    fs.watchFile(envPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtimeMs !== prev.mtimeMs) trigger();
    });
}
