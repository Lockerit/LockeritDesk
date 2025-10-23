// electron/logger/logger.js  (ESM)
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { app } from 'electron';
import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

// __dirname/__filename en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const fileName = path.parse(__filename).name;

// Detectar prod/dev y resolver base de recursos
const isProd  = (process.resourcesPath && process.resourcesPath.includes('resources')) || __dirname.includes('app.asar');
const baseDir = isProd ? process.resourcesPath : path.resolve(__dirname, '..', '..');

// Resolver ruta de configuración de logger con varios candidatos
const resolveConfigPath = (file) => {
  const candidates = [
    path.join(process.resourcesPath || '', 'configFiles', file), // prod (extraResources)
    path.join(baseDir, 'configFiles', file),                     // dev
    path.join(process.cwd(), 'configFiles', file),               // fallback
  ];
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p; } catch { /* noop */ }
  }
  return null;
};

const configPath = resolveConfigPath('logger_config.json');

// Config por defecto
let config = {
  logDirectory: 'logs',     // subcarpeta bajo userData
  logLevel: 'info',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: false,
  maxSize: '10m',
  maxFiles: '14d',
};

// Cargar configuración desde JSON (si existe)
try {
  if (configPath) {
    const raw = fs.readFileSync(configPath, 'utf8');
    config = { ...config, ...JSON.parse(raw) };
  } else {
    console.warn(`[${fileName}] logger_config.json no encontrado. Usando configuración por defecto.`);
  }
} catch (err) {
  console.warn(`[${fileName}] Error leyendo logger_config.json, usando por defecto: ${err.message}`);
}

// Directorio de logs: %APPDATA%/Lockerit/logs (o equivalente). Con fallback si app no está lista.
let userDataDir;
try { userDataDir = app.getPath('userData'); }
catch { userDataDir = path.join(process.cwd(), '.userData'); }

const logsDir = path.join(userDataDir, config.logDirectory || 'logs');
try { fs.mkdirSync(logsDir, { recursive: true }); } catch { /* noop */ }

// Transport consola
const getConsoleTransport = () =>
  new transports.Console({
    format: format.combine(
      format.colorize(),
      format.printf((info) => `[${info.timestamp}] [${info.level}] ${info.message}`)
    ),
  });

// Transport rotativo a archivo
const getRotateTransport = (cfg = config) =>
  new DailyRotateFile({
    filename: path.join(logsDir, 'lockerit-%DATE%.log'),
    datePattern: cfg.datePattern,
    zippedArchive: cfg.zippedArchive,
    maxSize: cfg.maxSize,
    maxFiles: cfg.maxFiles,
  });

// Formato con stack si existe
const line = format.printf((info) => {
  const msg = info.stack || info.message;
  return `[${info.timestamp}] [${info.level.toUpperCase()}] ${msg}`;
});

// Instancia de logger
export const logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    line
  ),
  transports: [getConsoleTransport(), getRotateTransport()],
});

// Recargar dinámica (invocada desde loggerWatcher en main)
export const reloadLoggerConfig = () => {
  if (!configPath) return;
  try {
    const next = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config = { ...config, ...next };
    logger.level = config.logLevel;
    logger.clear();
    logger.add(getConsoleTransport());
    logger.add(getRotateTransport(config));
    console.log(`[${fileName}] Configuración de logger recargada dinámicamente`);
  } catch (err) {
    console.error(`[${fileName}] Error al recargar logger_config.json: ${err.message}`);
  }
};

export const getLoggerConfig = () => ({ ...config, logsDir });

export default logger;
