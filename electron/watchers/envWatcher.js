// preload/watchers/envWatcher.js
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const { logger } = require('../logger/logger');

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en el archivo .env al proceso principal.
 * También envía los valores iniciales.
 * 
 * @param {string} envPath - Ruta completa al archivo .env
 * @param {Electron.IpcRenderer} ipcRenderer - ipcRenderer para enviar eventos
 */
function watchEnvFile(envPath, ipcRenderer) {
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
                wsBaseUrl: parsedEnv.REACT_APP_WS_URL,
                wsBasePort: parsedEnv.REACT_APP_WS_PORT,
                wsBasePath: parsedEnv.REACT_APP_WS_PATH,
            };

            logger.debug(`[${fileName}] Contenido .env parseado: ${JSON.stringify(updatedEnv)}`);
            logger.info(`[${fileName}] Archivo .env cargado correctamente`);

            ipcRenderer.send('env-updated', updatedEnv);
        } catch (err) {
            logger.error(`[${fileName}] Error al cargar/parsing .env: ${err.message}`);
        }
    };

    logger.info(`[${fileName}] Observando archivo .env en: ${envPath}`);
    logger.debug(`[${fileName}] Cargando configuración inicial`);
    loadAndSendEnv();

    fs.watchFile(envPath, { interval: 1000 }, (curr, prev) => {
        if (curr.mtime !== prev.mtime) {
            logger.debug(`[${fileName}] Cambio detectado por fs.watchFile`);
            loadAndSendEnv();
        }
    });
}

module.exports = { watchEnvFile };
