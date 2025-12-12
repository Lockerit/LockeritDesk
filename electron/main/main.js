// electron/main/main.js  (ESM) — versión ajustada con mejoras de logging
import { exec, execFile } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import { app, BrowserWindow, ipcMain, shell, screen } from 'electron';
import say from 'say';
import 'source-map-support/register.js';

import { initLogger, getLogger } from '../logger/logger.js';
import { ttsWin } from '../utils/tts.win.js';
import { watchAuthKey } from '../watchers/authWatcher.js';
import { watchEnvFile } from '../watchers/envWatcher.js';
import { watchLockersColorsConfig } from '../watchers/lockersColorsWatcher.js';
import { watchLoggerConfig } from '../watchers/loggerWatcher.js';
import { watchSetupConfig } from '../watchers/setupWatcher.js';

// -------------------- __filename/__dirname (ESM) --------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fileName = path.parse(__filename).name;

let log = { info: console.log, warn: console.warn, error: console.error, debug: console.debug };

const messenger = {
  last: new Map(), // opcional: buffer de último payload por canal
  send(channel, payload) {
    this.last.set(channel, payload);
    if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
  },
  replayAll() {      // llama esto en did-finish-load si necesitas reemitir
    for (const [ch, p] of this.last.entries()) {
      if (win && !win.isDestroyed()) win.webContents.send(ch, p);
    }
  }
};

// Inicializa antes de usar getLogger (crea transporte a archivo/consola)
let win = null;
let lastCSP = null;
const isProd = app.isPackaged;

// -------------------- Trampas de proceso (LOGS TEMPRANOS) --------------------
process.on('uncaughtException', (e) => {
  const msg = `[${fileName}] uncaughtException: ${e?.stack || String(e)}`;
  if (log?.error) log.error(msg); else console.error(msg);
});

process.on('unhandledRejection', (e) => {
  const msg = `[${fileName}] unhandledRejection: ${String(e)}`;
  if (log?.error) log.error(msg); else console.error(msg);
});

log.info(`[${fileName}] Iniciando aplicación Electron`);

// -------------------- util: resolver rutas de configFiles --------------------
function resolveConfigPath(file) {
  const candidates = [
    path.join(process.resourcesPath || '', 'configFiles', file),      // prod (extraResources)
    path.join(app.getAppPath(), 'configFiles', file),                 // dev (raíz del proyecto)
    path.join(process.cwd(), 'configFiles', file),
    path.join(__dirname, '..', '..', 'configFiles', file),
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch { /* noop */ }
  }
  return null;
}

// -------------------- dotenv desde .env si existe --------------------
const envPathResolved = resolveConfigPath('.env');
if (envPathResolved) {
  dotenv.config({ path: envPathResolved });
  log.info(`[${fileName}] .env cargado desde ${envPathResolved}`);
} else {
  log.warn(`[${fileName}] .env no encontrado`);
}

// -------------------- Variables de entorno en uso --------------------
let currentEnv = {
  apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'http://localhost',
  apiBasePort: process.env.REACT_APP_API_BASE_PORT || '8080',
  apiBaseTimeout: process.env.REACT_APP_API_BASE_TIMEOUT || '30',
  apiBaseMaxRetries: process.env.REACT_APP_API_BASE_MAXRETRIES || 10,
  apiBaseDelayRetries: process.env.REACT_APP_API_BASE_DELAYRETRIES || 2,
  wsBaseUrl: process.env.REACT_APP_WS_URL || 'ws://localhost',
  wsBasePort: process.env.REACT_APP_WS_PORT || '8080',
  wsBasePath: process.env.REACT_APP_WS_PATH || ''
};

// -------------------- Helpers CSP --------------------
function buildCSP(env) {
  const apiBaseUrl = `${env.apiBaseUrl}:${env.apiBasePort}`;
  const websocketUrl = `${env.wsBaseUrl}:${env.wsBasePort}`;
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    `connect-src 'self' ${apiBaseUrl} ${websocketUrl}`
  ].join('; ');
}
function sendCSPIfChanged(window, newCsp) {
  if (newCsp && newCsp !== lastCSP) {
    log.info(`[${fileName}] CSP cambió, enviando al renderer`);
    window.webContents.send('update-csp', newCsp);
    lastCSP = newCsp;
  }
}

// -------------------- Pantalla / escala --------------------
function getScaleFactor() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const isPortrait = height > width;
  const baseWidth = isPortrait ? 1080 : 1920;
  const baseHeight = isPortrait ? 1920 : 1080;
  const scaleW = width / baseWidth;
  const scaleH = height / baseHeight;
  return parseFloat(Math.min(scaleW, scaleH).toFixed(2));
}
function getScreenData() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const factor = getScaleFactor();
  return { width, height, factor };
}
function sendScreenData() {
  const data = getScreenData();
  log.debug(`[${fileName}] Enviando tamaño ${data.width} ${data.height} ${data.factor}`);
  if (win && !win.isDestroyed()) win.webContents.send('screen-data', data);
}
// -------------------- Crear ventana --------------------
function createWindow({ fullscreen = true, frame = true } = {}) {
  log.info(`[${fileName}] Creando ventana principal...`);

  const preloadPath = path.join(__dirname, '../preload/preload.js');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    frame,
    fullscreen,
    width,
    height,
    show: false,
    icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
      zoomFactor: 1
    }
  });

  win.on('close', () => {
    log.info(`[${fileName}] Ventana cerrándose, deteniendo TTS si aplica`);
    if (process.platform === 'linux') {
      execFile('pkill', ['aplay'], (error) => {
        if (error) log.warn(`[${fileName}] No había procesos de aplay para detener: ${error}`);
      });
    } else if (process.platform === 'win32') {
      try { ttsWin.stop({ flush: true }); } catch (e) { log.warn(`[${fileName}] ttsWin.stop error: ${e?.message}`); }
    } else {
      try { say.stop(); } catch (e) { log.warn(`[${fileName}] say.stop error: ${e?.message}`); }
    }
    if (!win.isDestroyed()) win.webContents.send('app-close');
  });
  
  // Bloquear Google Fonts (ya contemplado)
  win.webContents.session.webRequest.onBeforeRequest(
    { urls: ['https://fonts.googleapis.com/*'] },
    (_details, callback) => callback({ cancel: true })
  );

  const loadUrl = isProd
    ? `file://${path.join(__dirname, '..', '..', 'dist', 'index.html')}`
    : 'http://localhost:5173';

  win.loadURL(loadUrl);
  log.info(`[${fileName}] Cargando URL: ${loadUrl}`);

  win.once('ready-to-show', () => {
    try {
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      win.setBounds({ x: 0, y: 0, width, height });
      win.show();
      log.info(`[${fileName}] Ventana lista y mostrada`);
    } catch (e) {
      log.warn(`[${fileName}] ready-to-show error: ${e.message}`);
    }
  });

  win.webContents.on('did-finish-load', () => {
    log.info(`[${fileName}] did-finish-load`);
    sendCSPIfChanged(win, buildCSP(currentEnv));
    sendScreenData();
    log.info('[main] Reemitiendo estados iniciales', { channels: Array.from(messenger.last.keys()) });
    messenger.replayAll();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, targetUrl) => {
    const isApp = targetUrl.startsWith('http://localhost') || targetUrl.startsWith('file://');
    if (!isApp) { e.preventDefault(); shell.openExternal(targetUrl); }
  });

  screen.on('display-metrics-changed', sendScreenData);
  screen.on('display-added', sendScreenData);
  screen.on('display-removed', sendScreenData);
}

// -------------------- IPC (CONFIG, LOGS, UTILIDADES) --------------------
ipcMain.handle('get-config', async () => {
  try {
    const p = resolveConfigPath('setup_config.json');
    if (p) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (err) {
    log.error(`[${fileName}] get-config error: ${err}`);
    return {};
  }
});

ipcMain.handle('get-lockers-colors', async () => {
  try {
    const p = resolveConfigPath('lockers_colors_config.json');
    if (p) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (err) {
    log.error(`[${fileName}] get-lockers-colors error: ${err}`);
    return {};
  }
});

ipcMain.handle('get-auth', async () => {
  try {
    const p = resolveConfigPath('auth_key.json');
    if (p) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (err) {
    log.error(`[${fileName}] get-auth error: ${err}`);
    return {};
  }
});

ipcMain.handle('get-logger', async () => {
  try {
    const p = resolveConfigPath('logger_config.json');
    if (p) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (err) {
    log.error(`[${fileName}] get-logger error: ${err}`);
    return {};
  }
});

ipcMain.handle('get-env', async () => {
  log.debug(`[${fileName}] get-env solicitado`);
  return { ...currentEnv };
});

// NUEVO: handler IPC unificado para logging desde renderer
ipcMain.handle('log:write', (_evt, { level = 'info', scope = 'renderer', message, meta }) => {
  const safeLevel = ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'].includes(level) ? level : 'info';
  const scoped = getLogger(scope || 'renderer');

  try {
    // Usa la API de objeto para preservar meta y permitir redacción/formateo
    scoped.log({ level: safeLevel, message, meta });
  } catch (e) {
    // Último recurso: imprime a consola si algo falló
    console.error('log:write failed', e);
  }
  return true;
});


ipcMain.handle('get-screen-data', async () => getScreenData());

ipcMain.handle('get-screen-data-once', async () => {
  if (!win) throw new Error('Window no creada aún');
  if (!win.isVisible()) {
    await new Promise(resolve => win.once('ready-to-show', resolve));
  }
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const factor = getScaleFactor();
  log.info(`[${fileName}] get-screen-data-once -> ${width}x${height} factor=${factor}`);
  return { width, height, factor };
});

// Versión de la app
ipcMain.handle('get-app-version', () => app.getVersion());

// -------------------- TTS --------------------
ipcMain.handle('tts-speak', async (_event, text, options = {}) => {
  const platform = process.platform;

  if (platform === 'win32') {
    ttsWin.speak(text, options);
    return true;
  }

  if (platform === 'linux') {
    // aquí dejas tu lógica Coqui + aplay
    return true;
  }

  // macOS u otros: say directo
  const { voiceName, rate = 1 } = options;
  try {
    say.speak(text, voiceName || undefined, rate, (err) => {
      if (err) {
        log.warn(`[${fileName}] say.speak error: ${err?.message || err}`);
      }
    });
  } catch (err) {
    log.error(`[${fileName}] say.speak throw: ${err?.message || err}`);
  }
  return true;
});

ipcMain.handle('tts-stop', () => {
  const platform = process.platform;

  if (platform === 'win32') {
    ttsWin.stop({ flush: true });
  } else if (platform === 'linux') {
    // stop Coqui (pkill aplay, etc.)
  } else {
    try { say.stop(); } catch (error) { log.warn(`[${fileName}] say.stop error: ${error?.message}`) };
  }
});

ipcMain.handle('tts-get-voices', async () => {
  const platform = process.platform;

  if (platform === 'win32') {
    return await ttsWin.getVoices();
  }

  if (platform === 'linux') {
    return [{ name: 'Coqui-es-female', lang: 'es-ES' }];
  }

  return new Promise(resolve => {
    say.getInstalledVoices((err, voices) => {
      if (err || !voices) return resolve([]);
      resolve(voices.map(v => ({ name: v, lang: '' })));
    });
  });
});

// -------------------- Ventana --------------------
ipcMain.handle('window:get-state', () => {
  return { fullscreen: !!(win && win.isFullScreen && win.isFullScreen()) };
});

ipcMain.handle('window:set-fullscreen', (_e, enabled) => {
  if (win && typeof win.setFullScreen === 'function') {
    win.setFullScreen(!!enabled);
  }
  return { fullscreen: !!(win && win.isFullScreen && win.isFullScreen()) };
});

// -------------------- Otros IPC --------------------
ipcMain.on('app:exit', async () => {
  if (win && !win.isDestroyed()) win.webContents.send('app-close');
  setTimeout(() => app.quit(), 300);
});

// -------------------- Ciclo de vida de la app --------------------
app.whenReady().then(() => {

  // 1) inicializa logger y crea scoped logger
  initLogger();
  log = getLogger('main');
  if (process.platform === 'win32') {
    ttsWin.initWindowsTTS(log);
  }

  // 2) diagnóstico de rutas
  const exeDir = path.dirname(app.getPath('exe'));
  log.info('Rutas iniciales', {
    exeDir, appPath: app.getAppPath(), resources: process.resourcesPath, cwd: process.cwd()
  });

  // 3) registra watcher DESPUÉS de initLogger
  // Rutas de configs
  const paths = {
    logger: resolveConfigPath('logger_config.json'),
    env: resolveConfigPath('.env'),
    setup: resolveConfigPath('setup_config.json'),
    lockersColors: resolveConfigPath('lockers_colors_config.json'),
    auth: resolveConfigPath('auth_key.json'),
  };

  // Watchers centralizados (un solo registro por archivo)
  if (paths.logger) watchLoggerConfig(paths.logger, messenger);
  if (paths.env) watchEnvFile(paths.env, messenger);
  if (paths.setup) watchSetupConfig(paths.setup, messenger);
  if (paths.lockersColors) watchLockersColorsConfig(paths.lockersColors, messenger);
  if (paths.auth) watchAuthKey(paths.auth, messenger);

  // .env: wrapper para actualizar CSP en caliente en producción
  if (paths.env) {
    watchEnvFile(paths.env, {
      send: (channel, updatedEnv) => {
        if (isProd && channel === 'env-updated') {
          currentEnv = updatedEnv;
          sendCSPIfChanged(win, buildCSP(currentEnv));
        }
        messenger.send(channel, updatedEnv);
      }
    });
  }

  // Otros
  if (paths.setup) watchSetupConfig(paths.setup, messenger);
  if (paths.lockersColors) watchLockersColorsConfig(paths.lockersColors, messenger);
  if (paths.auth) watchAuthKey(paths.auth, messenger);

  log.info(`[${fileName}] App Lista whenReady`);

  if (process.platform === 'linux') {
    const composePath = resolveConfigPath('docker-compose.yml');
    if (composePath) {
      const command = `docker compose -f "${composePath}" up -d coqui-tts`;
      exec(command, (err, _stdout, stderr) => {
        if (err) log.error(`[${fileName}] Error levantando Coqui TTS: ${err}, stderr: ${stderr}`);
        else log.info(`[${fileName}] Coqui TTS solicitado vía docker compose`);
      });
    }
  }
  createWindow();
});

app.on('window-all-closed', async () => {
  log.info(`[${fileName}] window-all-closed`);
  if (process.platform !== 'darwin') {
    if (win && !win.isDestroyed()) win.webContents.send('app-close');
    try { await ipcMain.emit('tts-stop'); } catch { /* noop */ }
    setTimeout(() => app.quit(), 1000);
  }
});
