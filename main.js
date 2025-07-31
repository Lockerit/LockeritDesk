const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain } = require('electron');
const dotenv = require('dotenv');
const { logger } = require('./electron/logger/logger');
const { exec } = require('child_process');

const fileName = path.parse(__filename).name;

let win;
let keyboardProcess = null;

logger.info(`[${fileName}] Iniciando aplicación Electron`);

const isProd = app.isPackaged;

const envPath = isProd
  ? path.join(process.resourcesPath, 'configFiles/.env')
  : path.join(__dirname, 'configFiles/.env');

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(`[${fileName}] .env cargado desde ${envPath}`);
} else {
  logger.warn(`[${fileName}] .env NO encontrado en: ${envPath}`);
}

let currentEnv = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost',
  apiBasePort: process.env.REACT_APP_API_BASE_PORT || '3000',
  apiBaseTimeout: process.env.REACT_APP_API_BASE_TIMEOUT || '30000',
  apiBaseMaxRetries: process.env.REACT_APP_API_BASE_MAXRETRIES || 5,
  apiBaseMaxRetries: process.env.REACT_APP_API_BASE_DELAYRETRIES || 1,
  wsBaseUrl: process.env.REACT_APP_WS_URL || 'ws://localhost',
  wsBasePort: process.env.REACT_APP_WS_PORT || '3000'
};

function buildCSP(currentEnv) {
  const apiBaseUrl = `${currentEnv.apiBaseUrl}:${currentEnv.apiBasePort}`;
  const websocketUrl = `${currentEnv.wsBaseUrl}:${currentEnv.wsBasePort}`;

  const csp = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiBaseUrl} ${websocketUrl}`
  ].join('; ');

  logger.debug(`[${fileName}] CSP generada: ${csp}`);
  return csp;
}

function createWindow() {
  logger.info(`[${fileName}] Creando ventana principal...`);
  const preloadPath = path.join(__dirname, 'preload.js');

  win = new BrowserWindow({
    fullscreen: true,
    frame: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false
    }
  });

  win.webContents.session.webRequest.onBeforeRequest(
    { urls: ['https://fonts.googleapis.com/*'] },
    (details, callback) => {
      logger.info(`[${fileName}] Bloqueando Google Fonts externo`);
      callback({ cancel: true });
    }
  );

  const loadUrl = isProd
    ? `file://${path.join(__dirname, 'dist', 'index.html')}`
    : 'http://localhost:5173';

  win.loadURL(loadUrl);
  logger.info(`[${fileName}] Cargando URL: ${loadUrl}`);

  if (!isProd) {
    win.webContents.openDevTools();
  }

  const initialCSP = buildCSP(currentEnv);

  win.webContents.on('did-finish-load', () => {
    logger.info(`[${fileName}] Enviando CSP inicial al renderer`);
    win.webContents.send('update-csp', initialCSP);
  });
}

// ------------------- IPC HANDLERS -------------------

ipcMain.handle('open-os-keyboard', async () => {
  if (keyboardProcess) {
    // Ya está abierto
    return;
  }

  const oskPath = process.env.windir + '\\System32\\osk.exe';
  const fallbackPath = process.env.windir + '\\Sysnative\\osk.exe';

  return new Promise((resolve, reject) => {
    keyboardProcess = exec(`"${oskPath}"`, (err) => {
      if (err) {
        // Intenta fallback
        keyboardProcess = exec(`"${fallbackPath}"`, (err2) => {
          if (err2) {
            console.error('No se pudo abrir el teclado en pantalla:', err2);
            keyboardProcess = null;
            reject(err2);
          } else {
            resolve();
          }
        });
      } else {
        resolve();
      }
    });

    // Manejo si el proceso se cierra
    keyboardProcess.on('exit', () => {
      keyboardProcess = null;
    });
  });
});


ipcMain.handle('close-os-keyboard', async () => {
  return new Promise((resolve, reject) => {
    const powershellCommand = `
      $osk = Get-Process osk -ErrorAction SilentlyContinue;
      if ($osk) {
        Stop-Process -Name "osk" -Force
      }
    `;

    exec(`powershell -Command "${powershellCommand}"`, (err, stdout, stderr) => {
      if (err) {
        logger.warn(`[${fileName}] No se pudo cerrar osk.exe con PowerShell: ${err.message}`);
        return reject(err);
      }
      logger.info(`[${fileName}] Teclado en pantalla cerrado correctamente`);
      keyboardProcess = null;
      resolve();
    });
  });
});

ipcMain.handle('get-config', async () => {
  try {
    const basePath = isProd ? process.resourcesPath : __dirname;
    const configPath = path.join(basePath, 'configFiles/setup_config.json');

    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      logger.debug(`[${fileName}] setup_config.json: ${data}`);
      return JSON.parse(data);
    } else {
      logger.warn(`[${fileName}] ${configPath} no encontrado`);
      return {};
    }
  } catch (err) {
    logger.error(`[${fileName}] Error al leer setup_config.json: ${err}`);
    return {};
  }
});

ipcMain.on('config-updated', (event, updatedConfig) => {
  logger.info(`[${fileName}] Recibido config actualizado`);
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('config-updated', updatedConfig);
  });
});

ipcMain.handle('get-auth', async () => {
  try {
    const basePath = isProd ? process.resourcesPath : __dirname;
    const authPath = path.join(basePath, 'configFiles/auth_key.json');

    if (fs.existsSync(authPath)) {
      const data = fs.readFileSync(authPath, 'utf8');
      logger.debug(`[${fileName}] auth_key.json: ${data}`);
      return JSON.parse(data);
    } else {
      logger.warn(`[${fileName}] ${authPath} no encontrado`);
      return {};
    }
  } catch (err) {
    logger.error(`[${fileName}] Error al leer auth_key.json: ${err}`);
    return {};
  }
});

ipcMain.on('auth-updated', (event, updatedAuth) => {
  logger.info(`[${fileName}] Recibido auth actualizado`);
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('auth-updated', updatedAuth);
  });
});

ipcMain.handle('get-logger', async () => {
  try {
    const basePath = isProd ? process.resourcesPath : __dirname;
    const loggerPath = path.join(basePath, 'configFiles/logger_config.json');

    if (fs.existsSync(loggerPath)) {
      const data = fs.readFileSync(loggerPath, 'utf8');
      logger.debug(`[${fileName}] logger_config.json: ${data}`);
      return JSON.parse(data);
    } else {
      logger.warn(`[${fileName}] ${loggerPath} no encontrado`);
      return {};
    }
  } catch (err) {
    logger.error(`[${fileName}] Error al leer logger_config.json: ${err}`);
    return {};
  }
});

ipcMain.on('logger-updated', (event, updatedLogger) => {
  logger.info(`[${fileName}] Recibido logger actualizado`);
  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('logger-updated', updatedLogger);
  });
});

ipcMain.handle('get-env', async () => {
  const { REACT_APP_API_BASE_URL, REACT_APP_API_BASE_PORT, REACT_APP_API_BASE_TIMEOUT, REACT_APP_API_BASE_MAXRETRIES, REACT_APP_API_BASE_DELAYRETRIES, REACT_APP_WS_URL, REACT_APP_WS_PORT, REACT_APP_WS_PATH } = process.env;
  logger.debug(`[${fileName}] Datos .env: ${REACT_APP_API_BASE_URL}, ${REACT_APP_API_BASE_PORT}, ${REACT_APP_API_BASE_TIMEOUT}, ${REACT_APP_API_BASE_MAXRETRIES}, ${REACT_APP_API_BASE_DELAYRETRIES},${REACT_APP_WS_URL}, ${REACT_APP_WS_PORT}, ${REACT_APP_WS_PATH}`);
  return {
    apiBaseUrl: REACT_APP_API_BASE_URL,
    apiBasePort: REACT_APP_API_BASE_PORT,
    apiBaseTimeout: REACT_APP_API_BASE_TIMEOUT,
    apiBaseMaxRetries: REACT_APP_API_BASE_MAXRETRIES,
    apiBaseDelayRetries: REACT_APP_API_BASE_DELAYRETRIES,
    wsBaseUrl: REACT_APP_WS_URL,
    wsBasePort: REACT_APP_WS_PORT,
    wsBasePath: REACT_APP_WS_PATH
  };
});

ipcMain.on('env-updated', (event, updatedEnv) => {
  logger.info(`[${fileName}] Recibido env actualizado`);

  if (isProd) {
    currentEnv = updatedEnv;
    const newCSP = buildCSP(currentEnv);
    logger.debug(`[${fileName}] Nueva CSP generada: ${newCSP}`);
    BrowserWindow.getAllWindows().forEach((win) => {
      win.webContents.send('update-csp', newCSP);
    });
  }

  BrowserWindow.getAllWindows().forEach((win) => {
    win.webContents.send('env-updated', updatedEnv);
  });
});

ipcMain.on('log-message', (event, { level, message }) => {
  if (logger[level]) {
    logger[level](`[${fileName}] ${message}`);
  } else {
    logger.info(`[${fileName}] ${message}`);
  }
});


// main.js
ipcMain.handle('app:exit-safe', async () => {
  try {
    await ipcMain.handle('close-os-keyboard')();
  } catch (err) {
    logger.warn(`[${fileName}] Error al cerrar teclado antes de salir: ${err.message}`);
  }

  setTimeout(() => {
    app.quit();
  }, 300);
});


ipcMain.on('app:exit', () => {
  logger.info(`[${fileName}] Cerrando aplicación...`);
  // Cierra el teclado primero
  if (keyboardProcess) {
    keyboardProcess.kill();
    keyboardProcess = null;
  }
  setTimeout(() => {
    app.quit();
  }, 300);
});

// ------------------- EVENTOS APP -------------------

app.whenReady().then(() => {
  logger.info(`[${fileName}] App lista, creando ventana...`);
  createWindow();
});

app.on('window-all-closed', () => {

  // Cierra el teclado primero
  if (keyboardProcess) {
    keyboardProcess.kill();
    keyboardProcess = null;
  }

  if (process.platform !== 'darwin') {
    logger.info(`[${fileName}] Cerrando aplicación (todas las ventanas cerradas)`);
    setTimeout(() => {
      app.quit();
    }, 300);
  }
});
