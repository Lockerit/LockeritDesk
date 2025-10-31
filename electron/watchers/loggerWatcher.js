// electron/watchers/loggerWatcher.js (ESM) — watcher robusto y sin duplicados
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getLogger, reloadLoggerConfig } from '../logger/logger.js';

// __filename/__dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fileName = path.parse(__filename).name;
const log = getLogger(fileName);

// Niveles válidos para Winston
const VALID_LEVELS = new Set(['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']);

/**
 * Lee el archivo con pequeños reintentos por si está siendo escrito (evita JSON truncado).
 */
async function safeReadFile(p, tries = 3, delayMs = 120) {
  for (let i = 0; i < tries; i++) {
    try {
      return fs.readFileSync(p, 'utf8');
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(res => setTimeout(res, delayMs));
    }
  }
}

/**
 * Parsea y sanea la configuración de logger.
 */
function parseAndSanitize(raw) {
  const cfg = JSON.parse(raw);

  // Sanea level
  if (cfg.level && !VALID_LEVELS.has(String(cfg.level))) {
    log.warn(`[${fileName}] level inválido "${cfg.level}", usando "info"`);
    cfg.level = 'info';
  }
  // Valores por defecto mínimos
  cfg.dirname = cfg.dirname || 'logs';
  cfg.filename = cfg.filename || 'app-%DATE%.log';
  cfg.datePattern = cfg.datePattern || 'YYYY-MM-DD';
  cfg.maxFiles = cfg.maxFiles || '14d';
  cfg.maxSize = cfg.maxSize || '20m';
  cfg.console = !!cfg.console;
  cfg.redact = Array.isArray(cfg.redact) ? cfg.redact : ['phone', 'pin', 'password', 'token'];

  return cfg;
}

/**
 * Hash de contenido para detectar cambios reales.
 */
function hashContent(s) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

/**
 * Observa y emite cambios en logger_config.json.
 * @param {string} loggerPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchLoggerConfig(loggerPath, messenger = { send: () => { } }) {
  if (!loggerPath || !fs.existsSync(loggerPath)) {
    log.error(`[${fileName}] logger_config.json NO encontrado en: ${loggerPath || '(sin ruta)'}`);
    return;
  }

  const safeSend = (payload) => {
    try { messenger.send('logger-updated', payload); }
    catch (e) { log.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
  };

  let lastHash = null;

  const loadApplyNotify = async () => {
    try {
      const raw = await safeReadFile(loggerPath);
      const nextHash = hashContent(raw);
      if (nextHash === lastHash) return; // nada cambió

      const cfg = parseAndSanitize(raw);

      // Log resumido
      log.info(`[${fileName}] logger_config.json actualizado`, {
        path: loggerPath,
        level: cfg.level,
        dirname: cfg.dirname,
        filename: cfg.filename
      });
      log.debug(`[${fileName}] logger_config.json (claves)`, { keys: Object.keys(cfg) });

      // 1) Reconfigura Winston en caliente
      reloadLoggerConfig(cfg);

      // 2) Notifica al renderer (para UI)
      safeSend(cfg);

      lastHash = nextHash;
    } catch (err) {
      log.error(`[${fileName}] Error al procesar logger_config.json: ${err?.message || err}`);
    }
  };

  log.info(`[${fileName}] Observando logger_config.json`, { path: loggerPath });

  // Carga inicial
  loadApplyNotify();

  // Debounce para eventos repetidos
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(loadApplyNotify, 120);
  };

  // fs.watch: change/rename
  try {
    fs.watch(loggerPath, (eventType) => {
      if (eventType === 'change' || eventType === 'rename') {
        // en rename, el archivo puede ser reemplazado; verifica existencia
        if (fs.existsSync(loggerPath)) trigger();
      }
    });
  } catch (e) {
    log.warn(`[${fileName}] fs.watch falló (${e?.message || e}), usando fs.watchFile`);
  }

  // Fallback: watchFile por mtime
  fs.watchFile(loggerPath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) trigger();
  });
}
