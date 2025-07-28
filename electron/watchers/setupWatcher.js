// preload/watchers/setupWatcher.js
const fs = require('fs');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en el archivo setup_config.json al proceso principal.
 * También envía la configuración inicial.
 * 
 * @param {string} configPath - Ruta completa al archivo setup_config.json
 * @param {Electron.IpcRenderer} ipcRenderer - ipcRenderer para enviar eventos
 */
function watchSetupConfig(configPath, ipcRenderer) {
    if (!fs.existsSync(configPath)) {
        logger.error(`[${fileName}] Archivo setup_config.json NO encontrado en: ${configPath}`);
        return;
    }

    const loadAndSendConfig = () => {
        try {
            const updatedRaw = fs.readFileSync(configPath, 'utf8');
            const updatedConfig = JSON.parse(updatedRaw);

            logger.debug(`[${fileName}] Contenido setup_config.json parseado: ${JSON.stringify(updatedConfig)}`);
            logger.info(`[${fileName}] Archivo setup_config.json cargado correctamente`);

            ipcRenderer.send('config-updated', updatedConfig);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar setup_config.json: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando archivo setup_config.json en: ${configPath}`);
    logger.debug(`[${fileName}] Cargando configuración inicial`);
    loadAndSendConfig();

    try {
        fs.watch(configPath, (eventType) => {
            if (eventType === 'change') {
                logger.debug(`[${fileName}] Cambio detectado por fs.watch`);
                loadAndSendConfig();
            }
        });
    } catch (err) {
        logger.warn(`[${fileName}] fs.watch falló, usando fs.watchFile como respaldo`);
    }

    fs.watchFile(configPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            logger.debug(`[${fileName}] Cambio detectado por fs.watchFile`);
            loadAndSendConfig();
        }
    });
}

module.exports = { watchSetupConfig };
