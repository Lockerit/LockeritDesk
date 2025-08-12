const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain } = require('electron');
const dotenv = require('dotenv');
const { logger } = require('./electron/logger/logger');
const { exec } = require('child_process');

const fileName = path.parse(__filename).name;

let win = null;

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
  apiBasePort: process.env.REACT_APP_API_BASE_PORT || '8080',
  apiBaseTimeout: process.env.REACT_APP_API_BASE_TIMEOUT || '30',
  apiBaseMaxRetries: process.env.REACT_APP_API_BASE_MAXRETRIES || 10,
  apiBaseMaxRetries: process.env.REACT_APP_API_BASE_DELAYRETRIES || 2,
  wsBaseUrl: process.env.REACT_APP_WS_URL || 'ws://localhost',
  wsBasePort: process.env.REACT_APP_WS_PORT || '8080'
};

let lastCSP = buildCSP(currentEnv);

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

function recreateWindow() {
  if (win) {
    win.once('closed', () => {
      win = null;
      createWindow();
    });
    win.close(); // Usa close() para disparar el evento 'closed'
  } else {
    createWindow();
  }
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
  return new Promise((resolve, reject) => {
    exec('start osk', { shell: true }, (error, stdout, stderr) => {
      if (error) {
        logger.error(`[${fileName}] Error al abrir osk: ${error.message}`);
        return reject(error);
      }
      logger.info(`[${fileName}] Teclado en pantalla abierto.`);
      resolve();
    });
  });
});


ipcMain.handle('close-os-keyboard', async () => {
  return new Promise((resolve) => {
    const powershellCommand = `
      $osk = Get-Process osk -ErrorAction SilentlyContinue;
      if ($osk) {
        Stop-Process -Name "osk" -Force
      }
    `;

    exec(`powershell -Command "${powershellCommand}"`, (err) => {
      if (err) {
        logger.warn(`[${fileName}] (No fatal) Error cerrando osk.exe: ${err.message}`);
      } else {
        logger.info(`[${fileName}] Teclado en pantalla cerrado correctamente`);
      }

      // Siempre limpiamos el puntero, incluso si ya estaba cerrado
      keyboardProcess = null;
      resolve(); // Nunca rechazamos
    });
  });
});


// Fuera del ipcMain.handle, una sola vez:
const closeOSK = () => {
  return new Promise((resolve, reject) => {
    const powershellCommand = `
      $osk = Get-Process osk -ErrorAction SilentlyContinue;
      if ($osk) {
        Stop-Process -Name "osk" -Force
      }
    `;

    exec(`powershell -Command "${powershellCommand}"`, (err) => {
      if (err) {
        logger.warn(`[${fileName}] (No fatal) Error cerrando osk.exe: ${err.message}`);
      } else {
        logger.info(`[${fileName}] Teclado en pantalla cerrado correctamente`);
      }

      // Siempre limpiamos el puntero, incluso si ya estaba cerrado
      keyboardProcess = null;
      resolve(); // Nunca rechazamos
    });
  });
};


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

    if (newCSP !== lastCSP) {
      lastCSP = newCSP;
      logger.info(`[${fileName}] CSP cambió, recreando ventana...`);
      recreateWindow();
      return;
    }
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


ipcMain.on('app:exit', async () => {
  logger.info(`[${fileName}] Cerrando aplicación...`);
  setTimeout(() => {
    app.quit();
  }, 300);
});

// ------------------- EVENTOS APP -------------------

app.whenReady().then(() => {
  logger.info(`[${fileName}] App lista, creando ventana...`);
  createWindow();
});

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    logger.info(`[${fileName}] Cerrando aplicación (todas las ventanas cerradas)`);
    setTimeout(() => {
      app.quit();
    }, 300);
  }
});
