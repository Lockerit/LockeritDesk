// electron/watchers/authWatcher.js
const fs = require('fs');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en auth_key.json.
 * @param {string} authPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
function watchAuthKey(authPath, messenger) {
    if (!fs.existsSync(authPath)) {
        logger.error(`[${fileName}] auth_key.json NO encontrado: ${authPath}`);
        return;
    }

    const loadAndSendAuth = () => {
        try {
            const raw = fs.readFileSync(authPath, 'utf8');
            const parsed = JSON.parse(raw);
            logger.debug(`[${fileName}] auth_key.json: ${raw}`);
            messenger.send('auth-updated', parsed);
        } catch (err) {
            logger.error(`[${fileName}] Error al leer/parsear auth_key.json: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando: ${authPath}`);
    loadAndSendAuth();

    try {
        fs.watch(authPath, (eventType) => {
            if (eventType === 'change') loadAndSendAuth();
        });
    } catch (err) {
        logger.warn(`[${fileName}] fs.watch falló: ${err.message}, usando fs.watchFile`);
    }

    fs.watchFile(authPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) loadAndSendAuth();
    });
}

module.exports = { watchAuthKey };
