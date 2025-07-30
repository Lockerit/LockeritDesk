const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { logger } = require('./electron/logger/logger');
const { watchSetupConfig } = require('./electron/watchers/setupWatcher');
const { watchAuthKey } = require('./electron/watchers/authWatcher');
const { watchEnvFile } = require('./electron/watchers/envWatcher');
const { watchLoggerConfig } = require('./electron/watchers/loggerWatcher');

const packageJson = require('./package.json');
const fileName = path.parse(__filename).name;

try {
  logger.info(`[${fileName}] Inicializando preload.js`);

  const isProd = __dirname.includes('app.asar');
  const basePath = isProd ? process.resourcesPath : __dirname;

  const envPath = path.join(basePath, 'configFiles/.env');
  const configPath = path.join(basePath, 'configFiles/setup_config.json');
  const loggerPath = path.join(basePath, 'configFiles/logger_config.json');
  const authPath = path.join(basePath, 'configFiles/auth_key.json');

  try {
    watchSetupConfig(configPath, ipcRenderer);
    logger.info(`[${fileName}] Watcher iniciado: setup_config.json`);
  } catch (err) {
    logger.error(`[${fileName}] Error al iniciar watchSetupConfig: ${err}`);
  }

  try {
    watchAuthKey(authPath, ipcRenderer);
    logger.info(`[${fileName}] Watcher iniciado: auth_key.json`);
  } catch (err) {
    logger.error(`[${fileName}] Error al iniciar watchAuthKey: ${err}`);
  }

  try {
    watchLoggerConfig(loggerPath, ipcRenderer);
    logger.info(`[${fileName}] Watcher iniciado: logger_config.json`);
  } catch (err) {
    logger.error(`[${fileName}] Error al iniciar watchLoggerConfig: ${err}`);
  }

  try {
    watchEnvFile(envPath, ipcRenderer);
    logger.info(`[${fileName}] Watcher iniciado: .env`);
  } catch (err) {
    logger.error(`[${fileName}] Error al iniciar watchEnvFile: ${err}`);
  }

  // Exponer API al renderer
  contextBridge.exposeInMainWorld('electronAPI', {
    exitApp: () => ipcRenderer?.send?.('app:exit'),
    openKeyboard: () => ipcRenderer.invoke('open-os-keyboard'),
    getEnv: () => ipcRenderer?.invoke?.('get-env'),
    onEnvUpdate: (callback) => ipcRenderer.on('env-updated', (_, data) => callback(data)),
    getConfig: () => ipcRenderer.invoke('get-config'),
    onConfigUpdate: (callback) => ipcRenderer.on('config-updated', (_, data) => callback(data)),
    getLogger: () => ipcRenderer.invoke('get-logger'),
    onLoggerUpdate: (callback) => ipcRenderer.on('logger-updated', (_, data) => callback(data)),
    getAuth: () => ipcRenderer.invoke('get-auth'),
    onAuthUpdate: (callback) => ipcRenderer.on('auth-updated', (_, data) => callback(data)),
    log: (level, message) => ipcRenderer.send('log-message', { level, message }),
    getAppVersion: () => packageJson.version,
    onUpdateCSP: (callback) => ipcRenderer.on('update-csp', (_event, csp) => callback(csp))
  });

  logger.info(`[${fileName}] API expuesta en window.electronAPI`);

} catch (error) {
  logger.error(`[${fileName}] Error general en preload.js: ${error}`);
}
