// electron/preload/preload.js  (ESM)
import { contextBridge, ipcRenderer } from 'electron';
import 'source-map-support/register.js';

// Helpers seguros para suscripción/desuscripción
function on(channel, handler) {
  if (typeof handler !== 'function') return () => {};
  const listener = (_evt, payload) => handler(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

function onRaw(channel, handler) {
  // para callbacks que esperan (event, ...args), ej: compatibilidad directa
  if (typeof handler !== 'function') return () => {};
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('electronAPI', {
  // App
  exitApp: () => ipcRenderer.send('app:exit'),
  requestExit: () => ipcRenderer.send('app:request-exit'),
  onAppClose: (cb) => onRaw('app-close', cb),

  // Logs (unificado)
  // Uso: window.electronAPI.log('info', 'mensaje', { metaOpcional }, 'scopeOpcional')
  log: (level, message, meta = {}, scope = 'renderer') =>
    ipcRenderer.invoke('log:write', { level, scope, message, meta }),

  // Version
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // CSP
  onUpdateCSP: (cb) => on('update-csp', cb),
  reloadApp: () => ipcRenderer.send('reload-app'),

  // Config y estado (observados por main)
  getEnv: () => ipcRenderer.invoke('get-env'),
  onEnvUpdate: (cb) => on('env-updated', cb),

  getConfig: () => ipcRenderer.invoke('get-config'),
  onConfigUpdate: (cb) => on('config-updated', cb),

  getLogger: () => ipcRenderer.invoke('get-logger'),
  onLoggerUpdate: (cb) => on('logger-updated', cb),

  getAuth: () => ipcRenderer.invoke('get-auth'),
  onAuthUpdate: (cb) => on('auth-updated', cb),

  // Pantalla
  getScreenDataOnce: () => ipcRenderer.invoke('get-screen-data-once'),
  onScreenData: (cb) => on('screen-data', cb),

  // Teclado virtual (si lo usas desde main)
  onFocusKeyboard: (cb) => onRaw('focus-input-for-keyboard', cb),

  // TTS
  speak: (text, options) => ipcRenderer.invoke('tts-speak', text, options),
  stop: () => ipcRenderer.invoke('tts-stop'),
  getVoices: () => ipcRenderer.invoke('tts-get-voices'),

  // Ventana
  setFullScreen: (v) => ipcRenderer.send('set-fullscreen', v),
  setFrame: (v) => ipcRenderer.send('set-frame', v),
});
