// electron/watchers/envWatcher.js
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en .env.
 * @param {string} envPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
function watchEnvFile(envPath, messenger) {
    if (!fs.existsSync(envPath)) {
        logger.error(`[${fileName}] Archivo .env NO encontrado en: ${envPath}`);
        return;
    }

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

            logger.debug(`[${fileName}] .env parseado: ${JSON.stringify(updatedEnv)}`);
            messenger.send('env-updated', updatedEnv);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar/parsing .env: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando: ${envPath}`);
    loadAndSendEnv();

    fs.watchFile(envPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) loadAndSendEnv();
    });
}

module.exports = { watchEnvFile };
