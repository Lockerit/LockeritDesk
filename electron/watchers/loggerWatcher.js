// electron/watchers/loggerWatcher.js  (ESM)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../logger/logger.js';

// __filename/__dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const fileName = path.parse(__filename).name;

/**
 * Observa y emite cambios en logger_config.json.
 * @param {string} loggerPath
 * @param {{ send: (channel: string, payload: any) => void }} messenger
 */
export function watchLoggerConfig(loggerPath, messenger = { send: () => {} }) {
  if (!loggerPath || !fs.existsSync(loggerPath)) {
    logger.error(`[${fileName}] logger_config.json NO encontrado en: ${loggerPath}`);
    return;
  }

  const safeSend = (payload) => {
    try { messenger.send('logger-updated', payload); }
    catch (e) { logger.warn(`[${fileName}] messenger.send falló: ${e?.message || e}`); }
  };

  const loadAndSendLogger = () => {
    try {
      const updatedRaw = fs.readFileSync(loggerPath, 'utf8');
      const updatedLogger = JSON.parse(updatedRaw);
      logger.debug?.(`[${fileName}] logger_config.json: ${JSON.stringify(updatedLogger)}`);
      safeSend(updatedLogger);
    } catch (err) {
      logger.error(`[${fileName}] Error al cargar logger_config.json: ${err.message}`);
    }
  };

  logger.info(`[${fileName}] Observando: ${loggerPath}`);
  loadAndSendLogger();

  // Debounce para múltiples eventos del SO por un solo cambio
  let timer = null;
  const trigger = () => {
    clearTimeout(timer);
    timer = setTimeout(loadAndSendLogger, 120);
  };

  try {
    fs.watch(loggerPath, (eventType) => {
      if (eventType === 'change') trigger();
    });
  } catch {
    logger.warn(`[${fileName}] fs.watch falló, usando fs.watchFile`);
  }

  fs.watchFile(loggerPath, { interval: 1000 }, (curr, prev) => {
    if (curr.mtimeMs !== prev.mtimeMs) trigger();
  });
}
