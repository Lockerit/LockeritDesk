// preload/watchers/authWatcher.js
const fs = require('fs');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en el archivo auth_key.json al proceso principal.
 * También envía la configuración inicial.
 * 
 * @param {string} authPath - Ruta completa al archivo auth_key.json
 * @param {Electron.IpcRenderer} ipcRenderer - ipcRenderer para enviar eventos
 */
function watchAuthKey(authPath, ipcRenderer) {
    if (!fs.existsSync(authPath)) {
        logger.error(`[${fileName}] auth_key.json NO encontrado: ${authPath}`);
        return;
    }

    const loadAndSendAuth = () => {
        try {
            const raw = fs.readFileSync(authPath, 'utf8');
            const parsed = JSON.parse(raw);

            logger.debug(`[${fileName}] Contenido del archivo: ${raw}`);
            logger.info(`[${fileName}] auth_key.json actualizado correctamente`);

            ipcRenderer.send('auth-updated', parsed);
        } catch (err) {
            logger.error(`[${fileName}] Error al leer o parsear auth_key.json: ${err.message}`);
        }
    };

    // Cargar config inicial
    logger.info(`[${fileName}] Observando archivo auth_key.json en: ${authPath}`);
    logger.debug(`[${fileName}] Cargando configuración inicial`);
    loadAndSendAuth();

    // Observación principal con fs.watch
    try {
        fs.watch(authPath, (eventType) => {
            if (eventType === 'change') {
                logger.debug(`[${fileName}] fs.watch detectó cambio en auth_key.json`);
                loadAndSendAuth();
            }
        });
    } catch (err) {
        logger.warn(`[${fileName}] fs.watch falló: ${err.message}, usando fs.watchFile como respaldo`);
    }

    // Respaldo con fs.watchFile
    fs.watchFile(authPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            logger.debug(`[${fileName}] fs.watchFile detectó cambio en auth_key.json`);
            loadAndSendAuth();
        }
    });
}

module.exports = { watchAuthKey };
