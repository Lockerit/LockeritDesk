// preload/watchers/setupWatcher.js
const fs = require('fs');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en el archivo logger_config.json al proceso principal.
 * También envía la configuración inicial.
 * 
 * @param {string} loggerPath - Ruta completa al archivo logger_config.json
 * @param {Electron.IpcRenderer} ipcRenderer - ipcRenderer para enviar eventos
 */
function watchLoggerConfig(loggerPath, ipcRenderer) {
    if (!fs.existsSync(loggerPath)) {
        logger.error(`[${fileName}] Archivo logger_config.json NO encontrado en: ${loggerPath}`);
        return;
    }

    const loadAndSendLogger = () => {
        try {
            const updatedRaw = fs.readFileSync(loggerPath, 'utf8');
            const updatedLogger = JSON.parse(updatedRaw);

            logger.debug(`[${fileName}] Contenido logger_config.json parseado: ${JSON.stringify(updatedLogger)}`);
            logger.info(`[${fileName}] Archivo logger_config.json cargado correctamente`);

            ipcRenderer.send('logger-updated', updatedLogger);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar logger_config.json: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando archivo logger_config.json en: ${loggerPath}`);
    logger.debug(`[${fileName}] Cargando configuración inicial`);
    loadAndSendLogger();

    try {
        fs.watch(loggerPath, (eventType) => {
            if (eventType === 'change') {
                logger.debug(`[${fileName}] Cambio detectado por fs.watch`);
                loadAndSendLogger();
            }
        });
    } catch (err) {
        logger.warn(`[${fileName}] fs.watch falló, usando fs.watchFile como respaldo`);
    }

    fs.watchFile(loggerPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            logger.debug(`[${fileName}] Cambio detectado por fs.watchFile`);
            loadAndSendLogger();
        }
    });
}

module.exports = { watchLoggerConfig };
