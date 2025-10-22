// electron/watchers/loggerWatcher.js
const fs = require('fs');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en logger_config.json.
 * @param {string} loggerPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
function watchLoggerConfig(loggerPath, messenger) {
    if (!fs.existsSync(loggerPath)) {
        logger.error(`[${fileName}] logger_config.json NO encontrado en: ${loggerPath}`);
        return;
    }

    const loadAndSendLogger = () => {
        try {
            const updatedRaw = fs.readFileSync(loggerPath, 'utf8');
            const updatedLogger = JSON.parse(updatedRaw);
            logger.debug(`[${fileName}] logger_config.json: ${JSON.stringify(updatedLogger)}`);
            messenger.send('logger-updated', updatedLogger);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar logger_config.json: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando: ${loggerPath}`);
    loadAndSendLogger();

    try {
        fs.watch(loggerPath, (eventType) => {
            if (eventType === 'change') loadAndSendLogger();
        });
    } catch {
        logger.warn(`[${fileName}] fs.watch falló, usando fs.watchFile`);
    }

    fs.watchFile(loggerPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) loadAndSendLogger();
    });
}

module.exports = { watchLoggerConfig };
