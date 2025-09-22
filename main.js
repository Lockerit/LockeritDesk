const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, ipcMain, screen } = require('electron');
const dotenv = require('dotenv');
const { logger } = require('./electron/logger/logger');
const { exec, execFile, spawn } = require("child_process");
const say = require('say');

const fileName = path.parse(__filename).name;

let win = null;
let lastCSP = null;
const isProd = app.isPackaged;

logger.info(`[${fileName}] Iniciando aplicación Electron`);


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
  apiBaseDelayRetries: process.env.REACT_APP_API_BASE_DELAYRETRIES || 2,
  wsBaseUrl: process.env.REACT_APP_WS_URL || 'ws://localhost',
  wsBasePort: process.env.REACT_APP_WS_PORT || '8080'
};

function createCacheDirs() {
  // 👇 ruta raíz del proyecto donde está el main.js
  const projectRoot = path.resolve(__dirname, "..");
  const cacheDir = path.join(projectRoot, "electron_cache");
  const gpuCacheDir = path.join(cacheDir, "GPUCache");

  // crear carpetas si no existen
  [cacheDir, gpuCacheDir].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // forzar Electron/Chromium a usar esas carpetas
  app.setPath("userData", cacheDir);
  app.setPath("cache", cacheDir);
}


function buildCSP(env) {
  const apiBaseUrl = `${env.apiBaseUrl}:${env.apiBasePort}`;
  const websocketUrl = `${env.wsBaseUrl}:${env.wsBasePort}`;

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

function sendCSPIfChanged(win, newCsp) {
  if (newCsp && newCsp !== lastCSP) {
    logger.info(`[${fileName}] CSP cambió, enviando al renderer`);
    win.webContents.send('update-csp', newCsp);
    lastCSP = newCsp;
  } else {
    logger.debug(`[${fileName}] CSP igual a la última enviada, no se envía`);
  }
}

function getScaleFactor() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  // Detectar orientación
  const isPortrait = height > width;

  // Base de referencia (tu diseño base)
  const baseWidth = isPortrait ? 1080 : 1920;
  const baseHeight = isPortrait ? 1920 : 1080;

  // Calcular escalas
  const scaleW = width / baseWidth;
  const scaleH = height / baseHeight;

  // Escogemos el menor para mantener proporciones
  const resolutionScale = Math.min(scaleW, scaleH);

  return parseFloat(resolutionScale.toFixed(2));
}

function sendScreenData() {
  const data = getScreenData();
  logger.debug(`[${fileName}] Enviando tamaño ${data.width} ${data.height} ${data.factor}`);
  win.webContents.send("screen-data", data);
}

let isRecreating = false;

function recreateWindow() {
  if (isRecreating) {
    logger.warn(`[${fileName}] Ya se está recreando la ventana, se ignora la petición`);
    return;
  }

  isRecreating = true;

  if (win) {
    logger.info(`[${fileName}] Destruyendo ventana actual para recrearla...`);

    win.once('closed', () => {
      logger.info(`[${fileName}] Ventana destruida, recreando...`);
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

  const factor = getScaleFactor();
  const preloadPath = path.join(__dirname, 'preload.js');
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;

  win = new BrowserWindow({
    frame,
    fullscreen,
    width: width,
    height: height,
    show: false,
    icon: path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      backgroundThrottling: false,
      zoomFactor: 1
    }
  });

  // Bloqueo de Google Fonts externos
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

  // Mostrar ventana cuando esté lista
  win.once('ready-to-show', () => {
    try {
      const { width, height } = screen.getPrimaryDisplay().workAreaSize;
      win.setBounds({ x: 0, y: 0, width, height });
      win.show();
    } catch (e) {
      logger.warn(`[${fileName}] ready-to-show error: ${e.message}`);
    }
  });

  // Solo aquí se envían datos iniciales (ya todo cargado)
  win.webContents.on('did-finish-load', () => {
    const initialCSP = buildCSP(currentEnv);
    sendCSPIfChanged(win, initialCSP);

    // Manda tamaño + factor una sola vez
    sendScreenData();
  });

  // opcional: escuchar cambios en el display (rotación, resolución)
  screen.on('display-metrics-changed', sendScreenData);
  screen.on('display-added', sendScreenData);
  screen.on('display-removed', sendScreenData);
}

// ------------------- IPC HANDLERS -------------------

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

// === Cuando se actualiza el .env ===
// Evento cuando cambia el .env
ipcMain.on('env-updated', (event, updatedEnv) => {
  logger.info(`[${fileName}] Recibido env actualizado`);

  if (isProd) {
    currentEnv = updatedEnv;
    const newCSP = buildCSP(currentEnv);
    BrowserWindow.getAllWindows().forEach((w) => sendCSPIfChanged(w, newCSP));
  }

  BrowserWindow.getAllWindows().forEach((w) => {
    w.webContents.send('env-updated', updatedEnv);
  });
});

ipcMain.on('reload-app', () => {
  logger.info(`[${fileName}] Recargando aplicación por petición del usuario`);
  recreateWindow()
});

ipcMain.on('log-message', (event, { level, message }) => {
  if (logger[level]) {
    logger[level](`[${fileName}] ${message}`);
  } else {
    logger.info(`[${fileName}] ${message}`);
  }
});

function getScreenData() {
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const factor = getScaleFactor();
  return { width, height, factor };
}

ipcMain.handle("get-screen-data", async () => {
  return getScreenData();
});

ipcMain.handle('get-screen-data-once', async () => {
  if (!win) throw new Error('Window no creada aún');
  if (!win.isVisible()) {
    await new Promise(resolve => win.once('ready-to-show', resolve));
  }
  const display = screen.getPrimaryDisplay();
  const { width, height } = display.workAreaSize;
  const factor = getScaleFactor();
  logger.info(`[${fileName}] get-screen-data-once -> ${width}x${height} factor=${factor}`);
  return { width, height, factor };
});


// ===============================
// HANDLER TTS
// ===============================
ipcMain.handle("tts-speak", async (event, text, options = {}) => {
  const { voiceName, rate = 1 } = options;
  const platform = process.platform;

  if (platform === "linux") {
    // 🐧 Linux → Coqui TTS vía servidor HTTP
    (async () => {
      try {
        const res = await fetch("http://localhost:5002/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text,
            voice: "tts_models/es/css10/vits"
          })
        });

        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const outputPath = path.join(app.getPath("temp"), "tts-output.wav");
        fs.writeFileSync(outputPath, buffer);

        // Reproducir con aplay
        exec(`aplay "${outputPath}"`);
      } catch (err) {
        logger.error(`Error con Coqui TTS: ${err}`);
      }
    })();
  } else if (platform === "win32" || platform === "darwin") {
    // 🪟 Windows / 🍎 macOS → say
    let finalVoice = voiceName;

    if (!finalVoice) {
      try {
        const installedVoices = await new Promise((resolve, reject) => {
          say.getInstalledVoices((err, voices) => {
            if (err) reject(err);
            else resolve(voices);
          });
        });

        // Buscar la primera voz en español
        finalVoice =
          installedVoices.find(v =>
            v.toLowerCase().includes("spanish") ||
            v.toLowerCase().includes("es-")
          ) || installedVoices[0]; // fallback: la primera disponible
      } catch (err) {
        logger.warn(`No se pudieron obtener las voces, usando default: ${err}`);
      }
    }

    say.speak(text, finalVoice, rate, (err) => {
      if (err) logger.error(`Error con say: ${err}`);
    });
  }
});

// ===============================
// HANDLER STOP
// ===============================
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

// ===============================
// HANDLER GET (Windows / macOS / Linux)
// ===============================
ipcMain.handle("tts-get-voices", async () => {
  const platform = process.platform;

  const psCmd = `$voices = @(); try { $spVoice = New-Object -ComObject SAPI.SpVoice; foreach ($v in $spVoice.GetVoices()) { $voices += [PSCustomObject]@{ Name = $v.GetDescription(); Lang = $v.GetAttribute('Language') } } } catch {} try { $oneCore = Get-ChildItem 'HKLM:\\SOFTWARE\\Microsoft\\Speech_OneCore\\Voices\\Tokens'; foreach ($v in $oneCore) { $token = (New-Object -ComObject SAPI.SpVoice).GetVoices('Name='+$v.PSChildName, $null); if ($token.Count -gt 0) { $voices += [PSCustomObject]@{ Name = $token.Item(0).GetDescription(); Lang = $token.Item(0).GetAttribute('Language') } } } } catch {} if ($voices.Count -eq 0) { $voices = @() }; $voices | ConvertTo-Json -Compress`;

  if (process.platform === "win32") {
    return new Promise((resolve) => {
      exec(`powershell -NoProfile -Command "${psCmd}"`, (err, stdout, stderr) => {
        if (err) {
          logger.error(`Error obteniendo voces de Windows: ${err}`);
          resolve([]);
          return;
        }
        try {
          stdout = (stdout || "").trim();
          if (!stdout) {
            logger.warn("No se devolvió ninguna voz desde PowerShell");
            resolve([]);
            return;
          }
          const voices = JSON.parse(stdout);
          logger.debug("Voces instaladas:", voices);
          resolve(voices);
        } catch (e) {
          logger.error(`Error parseando JSON: ${e}, stdout: ${stdout}`);
          resolve([]);
        }
      });
    });
  }

  if (platform === "darwin") {
    return new Promise((resolve) => {
      exec("say -v ?", (err, stdout) => {
        if (err) {
          logger.error(`Error listando voces macOS: ${err}`);
          resolve([]);
        } else {
          const voices = stdout
            .split("\n")
            .map(line => line.trim().split(/\s+/)[0])
            .filter(Boolean)
            .map(name => ({ Name: name, Lang: "" }));
          resolve(voices);
        }
      });
    });
  }

  if (platform === "linux") {
    return [{ Name: "Coqui-es-female", Lang: "es-ES (female)" }];
  }

  return [];
});

// Manejo de fullscreen dinámico
ipcMain.on("set-fullscreen", (event, value) => {
  if (win) {
    win.setFullScreen(value);
    logger.info(`[${fileName}] set-fullscreen: ${value}`);
  }
});

// Manejo de frame dinámico (requiere recrear ventana)
ipcMain.on("set-frame", (event, value) => {
  if (win) {
    const bounds = win.getBounds(); // guarda tamaño/posición
    const isFullScreen = win.isFullScreen(); // guarda estado fullscreen

    win.close();

    createWindow({
      frame: !!value,
      fullscreen: isFullScreen
    });

    win.setBounds(bounds); // restaura posición/tamaño
    logger.info(`[${fileName}] set-frame: ${value}`);
  }
});

// ------------------- EVENTOS APP -------------------
ipcMain.on('app:exit', async () => {
  logger.info(`[${fileName}] Cerrando aplicación...`);
  setTimeout(() => {
    app.quit();
  }, 300);
});

app.whenReady().then(() => {
  logger.info(`[${fileName}] App lista, creando ventana...`);

  if (process.platform === "linux") {

    const basePath = isProd ? process.resourcesPath : __dirname;
    const composePath = path.join(basePath, 'configFiles/docker-compose.yml');

    // Usar SIEMPRE docker compose (plugin nuevo)
    const command = `docker compose -f ${composePath} up -d coqui-tts`;
    exec(command, (err, stdout, stderr) => {
      if (err) {
        logger.error(`Error levantando Coqui TTS: ${err}, stderr: ${stderr}`);
      } else {
        logger.info(`[${fileName}] Coqui TTS levantado en Docker`);
      }
    });
  }

  createCacheDirs(); // crear y forzar cache en raiz
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
