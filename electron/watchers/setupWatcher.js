// electron/watchers/setupWatcher.js
const fs = require('fs');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en setup_config.json.
 * @param {string} configPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
function watchSetupConfig(configPath, messenger) {
    if (!fs.existsSync(configPath)) {
        logger.error(`[${fileName}] Archivo setup_config.json NO encontrado en: ${configPath}`);
        return;
    }

    const loadAndSendConfig = () => {
        try {
            const updatedRaw = fs.readFileSync(configPath, 'utf8');
            const updatedConfig = JSON.parse(updatedRaw);
            logger.debug(`[${fileName}] Contenido setup_config.json: ${JSON.stringify(updatedConfig)}`);
            messenger.send('config-updated', updatedConfig);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar setup_config.json: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando: ${configPath}`);
    loadAndSendConfig();

    try {
        fs.watch(configPath, (eventType) => {
            if (eventType === 'change') loadAndSendConfig();
        });
    } catch {
        logger.warn(`[${fileName}] fs.watch falló, usando fs.watchFile`);
    }

    fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) loadAndSendConfig();
    });
}

module.exports = { watchSetupConfig };
