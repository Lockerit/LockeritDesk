// electron/logger/logger.js
import fs from "node:fs";
import path from "node:path";

import { app } from "electron";
import { createLogger, format, transports } from "winston";
import * as Wdrf from 'winston-daily-rotate-file';

const DailyRotateFile = Wdrf.default || Wdrf;

let cfg = null;
let baseLogger = null;

function loadConfig() {
  try {
    const base = app.isPackaged ? process.resourcesPath : process.cwd();
    const p = path.join(base, "configFiles", "logger_config.json");
    const raw = fs.readFileSync(p, "utf-8");
    cfg = JSON.parse(raw);
    console.log('[diag] cfg path', p);
  } catch {
    cfg = {
      level: "info",
      dirname: "logs",
      filename: "app-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      maxFiles: "14d",
      maxSize: "20m",
      console: !app.isPackaged,
      redact: ["phone", "pin", "password", "token"]
    };
  }

  console.log('[diag] cfg', cfg);
  return cfg;
}

// Obtiene un directorio seguro incluso si app no está lista
function resolveLogDir() {
  const c = cfg || loadConfig();

  // Directorio base:
  // - PRODUCCIÓN / ejecutable portable: carpeta del EXE
  // - DESARROLLO: raíz del proyecto (process.cwd())
  let baseDir;
  try {
    const exeDir = path.dirname(app.getPath('exe')); // carpeta del .exe
    baseDir = app.isPackaged ? exeDir : process.cwd();
  } catch {
    baseDir = process.cwd();
  }

  const dir = path.isAbsolute(c.dirname)
    ? c.dirname
    : path.join(baseDir, c.dirname || 'logs');

  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Redactor simple
function redact(obj, keys) {
  try {
    if (!obj || typeof obj !== "object") return obj;
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    const walk = (o) => {
      Object.keys(o).forEach(k => {
        const v = o[k];
        if (keys.includes(k.toLowerCase())) {
          o[k] = "***";
        } else if (v && typeof v === "object") {
          walk(v);
        }
      });
    };
    walk(clone);
    return clone;
  } catch { return obj; }
}

export function initLogger() {

  if (baseLogger) {
    // ya inicializado; evita doble transporte y doble 'NEW file'
    return baseLogger;
  }

  loadConfig();
  const dir = resolveLogDir();

  const redactKeys = (cfg.redact || []).map(s => String(s).toLowerCase());
  const redactor = format((info) => {
    if (info.meta) info.meta = redact(info.meta, redactKeys);
    return info;
  });

  const fmt = format.combine(
    format.errors({ stack: true }),
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    redactor(),
    format.printf((info) => {
      // Ensamblar salida en el orden exacto solicitado
      const out = {
        timestamp: info.timestamp,
        appVersion: app.getVersion(),
        scope: info.scope,   // viene del child({ scope })
        level: info.level,
        message: info.message,
      };
      // if (info.meta) out.meta = info.meta;   // opcional
      // if (info.stack) out.stack = info.stack;  // opcional (errores)
      return JSON.stringify(out);
    })
  );

  const tps = [];
  let fileTransport = null;

  try {
    fileTransport = new DailyRotateFile({
      dirname: dir,
      filename: cfg.filename || "app-%DATE%.log",
      datePattern: cfg.datePattern || "YYYY-MM-DD",
      maxFiles: cfg.maxFiles || "14d",
      maxSize: cfg.maxSize || "20m",
      zippedArchive: false,
      level: cfg.level || "info",
    });

    fileTransport.on('new', (fname) => {
      console.log('[diag] daily-rotate NEW file =>', fname);
    });
    fileTransport.on('rotate', (oldF, newF) => {
      console.log('[diag] daily-rotate ROTATE', oldF, '→', newF);
    });
    fileTransport.on('error', (e) => {
      console.error('[diag] file transport error', e);
    });

    tps.push(fileTransport);
  } catch (e) {
    console.error('No se pudo crear el transporte de archivo para logs:', e);
  }

  // Siempre habilita consola en dev o si falló el file transport
  if (cfg.console || !fileTransport) {
    tps.push(new transports.Console({ level: cfg.level || "info" }));
  }

  baseLogger = createLogger({
    level: cfg.level || "info",
    format: fmt,
    defaultMeta: { appVersion: app.getVersion() },
    transports: tps,
  });

  if (!fileTransport) {
    baseLogger.log({ level: "warn", message: "logger sin transporte de archivo (usando consola)", scope: "logger" });
  }

  // escritura inmediata
  baseLogger.log({ level: "info", message: "logger inicializado", scope: "logger" });

  // segunda escritura para “despertar” stream
  setTimeout(() => {
    baseLogger.log({ level: "debug", message: "logger write check", scope: "logger" });
  }, 50);

  try {
    baseLogger.transports.forEach((t, i) => {
      console.log('[diag] transport', i, t.constructor?.name, t.dirname, t.filename, t.level);
    });
  } catch (e) {
    console.error('[diag] error listando transports', e);
  }

  return baseLogger;
}

export function getLogger(scope = "app") {
  if (!baseLogger) initLogger();
  return baseLogger.child({ scope });
}

export function reloadLoggerConfig(newCfg = {}) {
  cfg = { ...(cfg || {}), ...(newCfg || {}) };

  const dir = resolveLogDir();
  const fileT = new DailyRotateFile({
    dirname: dir,
    filename: cfg.filename || 'app-%DATE%.log',
    datePattern: cfg.datePattern || 'YYYY-MM-DD',
    maxFiles: cfg.maxFiles || '14d',
    maxSize: cfg.maxSize || '20m',
    zippedArchive: false,
    level: cfg.level || 'info',
  });
  fileT.on('error', (e) => console.error('[diag] file transport error (reload)', e));

  if (!baseLogger) initLogger();

  baseLogger.clear();
  baseLogger.add(fileT);
  if (cfg.console) baseLogger.add(new transports.Console({ level: cfg.level || 'info' }));
  baseLogger.level = cfg.level || 'info';

  baseLogger.log({ level: 'info', message: 'logger reconfigurado en caliente', scope: 'logger', meta: { dir } });

  // DIAGNÓSTICO: confirma que el transporte a archivo quedó agregado
  try {
    baseLogger.transports.forEach((t, i) => {
      console.log('[diag/reload] transport', i, t.constructor?.name, t.dirname, t.filename, t.level);
    });
  } catch (e) {
    console.error('[diag/reload] error listando transports', e);
  }
}

