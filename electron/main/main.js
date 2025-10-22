// electron/main/main.js
const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const dotenv = require('dotenv');
const { logger } = require('../logger/logger');
const { exec, execFile } = require("child_process");
const say = require('say');

const fileName = path.parse(__filename).name;
let win = null;
let lastCSP = null;
const isProd = app.isPackaged;

logger.info(`[${fileName}] Iniciando aplicación Electron`);

// ---------- resolver rutas de configFiles ----------
function resolveConfigPath(file) {
  const candidates = [
    path.join(process.resourcesPath || '', 'configFiles', file),       // prod
    path.join(app.getAppPath(), 'configFiles', file),                  // dev (raíz proyecto)
    path.join(process.cwd(), 'configFiles', file),
    path.join(__dirname, '..', '..', 'configFiles', file),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  return null;
}

// ---------- dotenv desde .env si existe ----------
const envPathResolved = resolveConfigPath('.env');
if (envPathResolved) {
  dotenv.config({ path: envPathResolved });
  logger.info(`[${fileName}] .env cargado desde ${envPathResolved}`);
} else {
  logger.warn(`[${fileName}] .env no encontrado`);
}

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

// ---------- CSP helpers ----------
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
    logger.info(`[${fileName}] CSP cambió, enviando al renderer`);
    window.webContents.send('update-csp', newCsp);
    lastCSP = newCsp;
  }
}

// ---------- ventana ----------
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
  logger.debug(`[${fileName}] Enviando tamaño ${data.width} ${data.height} ${data.factor}`);
  if (win && !win.isDestroyed()) win.webContents.send("screen-data", data);
}

let isRecreating = false;
function recreateWindow() {
  if (isRecreating) return;
  isRecreating = true;
  if (win) {
    win.once('closed', () => {
      win = null;
      setTimeout(() => {
        createWindow();
        isRecreating = false;
      }, 100);
    });
    win.close();
  } else {
    createWindow();
    isRecreating = false;
  }
}

function createWindow({ fullscreen = true, frame = false } = {}) {
  logger.info(`[${fileName}] Creando ventana principal...`);

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
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      zoomFactor: 1
    }
  });

  win.on("close", () => {
    if (process.platform === "linux") {
      execFile("pkill", ["aplay"], (error) => {
        if (error) logger.warn(`No había procesos de aplay para detener: ${error}`);
      });
    } else {
      say.stop();
    }
    if (!win.isDestroyed()) win.webContents.send("app-close");
  });

  win.webContents.session.webRequest.onBeforeRequest(
    { urls: ['https://fonts.googleapis.com/*'] },
    (_details, callback) => callback({ cancel: true })
  );

  const loadUrl = isProd
    ? `file://${path.join(__dirname, 'dist', 'index.html')}`
    : 'http://localhost:5173';

  win.loadURL(loadUrl);
  logger.info(`[${fileName}] Cargando URL: ${loadUrl}`);

  win.once('ready-to-show', () => {
    try {
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      win.setBounds({ x: 0, y: 0, width, height });
      win.show();
    } catch (e) {
      logger.warn(`[${fileName}] ready-to-show error: ${e.message}`);
    }
  });

  win.webContents.on('did-finish-load', () => {
    sendCSPIfChanged(win, buildCSP(currentEnv));
    sendScreenData();
  });

  screen.on('display-metrics-changed', sendScreenData);
  screen.on('display-added', sendScreenData);
  screen.on('display-removed', sendScreenData);

  // ----- Iniciar watchers aquí -----
  const { watchSetupConfig } = require('../watchers/setupWatcher');
  const { watchAuthKey } = require('../watchers/authWatcher');
  const { watchEnvFile } = require('../watchers/envWatcher');
  const { watchLoggerConfig } = require('../watchers/loggerWatcher');

  const messenger = {
    send: (channel, payload) => {
      if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
    }
  };

  const paths = {
    env: resolveConfigPath('.env'),
    setup: resolveConfigPath('setup_config.json'),
    logger: resolveConfigPath('logger_config.json'),
    auth: resolveConfigPath('auth_key.json'),
  };

  if (!paths.setup) logger.warn(`[${fileName}] setup_config.json no encontrado`);
  if (!paths.env) logger.warn(`[${fileName}] .env no encontrado`);
  if (!paths.logger) logger.warn(`[${fileName}] logger_config.json no encontrado`);
  if (!paths.auth) logger.warn(`[${fileName}] auth_key.json no encontrado`);

  if (paths.setup) watchSetupConfig(paths.setup, messenger);
  if (paths.auth) watchAuthKey(paths.auth, messenger);
  if (paths.logger) watchLoggerConfig(paths.logger, messenger);
  if (paths.env) watchEnvFile(paths.env, {
    send: (channel, updatedEnv) => {
      // actualiza CSP solo en prod
      if (isProd && channel === 'env-updated') {
        currentEnv = updatedEnv;
        sendCSPIfChanged(win, buildCSP(currentEnv));
      }
      messenger.send(channel, updatedEnv);
    }
  });
}

// ------------------- IPC -------------------
ipcMain.handle('get-config', async () => {
  try {
    const p = resolveConfigPath('setup_config.json');
    if (p) {
      const data = fs.readFileSync(p, 'utf8');
      return JSON.parse(data);
    }
    return {};
  } catch (err) {
    logger.error(`[${fileName}] get-config error: ${err}`);
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
    logger.error(`[${fileName}] get-auth error: ${err}`);
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
    logger.error(`[${fileName}] get-logger error: ${err}`);
    return {};
  }
});

ipcMain.handle('get-env', async () => {
  // Devuelve lo ya cargado en process.env (o lo que actualizó el watcher)
  return { ...currentEnv };
});

ipcMain.on('reload-app', () => {
  logger.info(`[${fileName}] Recargando aplicación`);
  recreateWindow();
});

ipcMain.on('log-message', (_event, { level, message }) => {
  if (logger[level]) logger[level](`[${fileName}] ${message}`);
  else logger.info(`[${fileName}] ${message}`);
});

ipcMain.handle("get-screen-data", async () => getScreenData());

ipcMain.handle('get-screen-data-once', async () => {
  if (!win) throw new Error('Window no creada aún');
  if (!win.isVisible()) {
    await new Promise(resolve => win.once('ready-to-show', resolve));
  }
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const factor = getScaleFactor();
  logger.info(`[${fileName}] get-screen-data-once -> ${width}x${height} factor=${factor}`);
  return { width, height, factor };
});

// TTS
ipcMain.handle("tts-speak", async (_event, text, options = {}) => {
  const { voiceName, rate = 1 } = options;
  const platform = process.platform;
  if (platform === "linux") {
    (async () => {
      try {
        const res = await fetch("http://localhost:5002/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, voice: "tts_models/es/css10/vits" })
        });
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const outputPath = path.join(app.getPath("temp"), "tts-output.wav");
        fs.writeFileSync(outputPath, buffer);
        exec(`aplay "${outputPath}"`);
      } catch (err) {
        logger.error(`Error con Coqui TTS: ${err}`);
      }
    })();
  } else {
    try {
      if (voiceName) global.cachedVoice = voiceName;
      const finalVoice = global.cachedVoice || null;
      say.speak(text, finalVoice, rate, (err) => {
        if (err) say.speak(text, undefined, rate);
      });
    } catch (err) {
      logger.error(`Error en tts-speak: ${err}`);
    }
  }
});

ipcMain.handle("tts-stop", () => {
  const platform = process.platform;
  if (platform === "linux") {
    execFile("pkill", ["aplay"], (error) => {
      if (error) logger.warn(`No había procesos de aplay para detener: ${error}`);
    });
  } else {
    say.stop();
  }
});

ipcMain.handle("tts-get-voices", async () => {
  const platform = process.platform;
  if (platform === "win32") {
    return new Promise((resolve) => {
      say.getInstalledVoices((err, voices) => {
        if (err) resolve([]); else resolve(voices.map(v => ({ name: v, lang: v.includes("Spanish") ? "es" : "en" })));
      });
    });
  }
  if (platform === "darwin") {
    return new Promise((resolve) => {
      exec("say -v ?", (err, stdout) => {
        if (err) resolve([]); else {
          const voices = stdout.split("\n").map(l => l.trim().split(/\s+/)[0]).filter(Boolean)
            .map(name => ({ name, lang: "" }));
          resolve(voices);
        }
      });
    });
  }
  if (platform === "linux") return [{ name: "Coqui-es-female", lang: "es-ES (female)" }];
  return [];
});

ipcMain.on("set-fullscreen", (_e, value) => {
  if (win) win.setFullScreen(!!value);
});

ipcMain.on("set-frame", (_e, value) => {
  if (!win) return;
  const bounds = win.getBounds();
  const isFullScreen = win.isFullScreen();
  win.close();
  createWindow({ frame: !!value, fullscreen: isFullScreen });
  win.setBounds(bounds);
});

ipcMain.on("app:exit", async () => {
  if (win && !win.isDestroyed()) win.webContents.send("app-close");
  setTimeout(() => app.quit(), 300);
});

app.whenReady().then(() => {
  if (process.platform === "linux") {
    const composePath = resolveConfigPath('docker-compose.yml');
    if (composePath) {
      const command = `docker compose -f "${composePath}" up -d coqui-tts`;
      exec(command, (err, _stdout, stderr) => {
        if (err) logger.error(`Error levantando Coqui TTS: ${err}, stderr: ${stderr}`);
      });
    }
  }
  createWindow();
});

app.on("window-all-closed", async () => {
  if (process.platform !== "darwin") {
    if (win && !win.isDestroyed()) win.webContents.send("app-close");
    try { await ipcMain.emit("tts-stop"); } catch { }
    setTimeout(() => app.quit(), 1000);
  }
});
