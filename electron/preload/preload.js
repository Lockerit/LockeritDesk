// electron/preload/preload.js  (ESM)
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // App
  exitApp: () => ipcRenderer.send('app:exit'),
  requestExit: () => ipcRenderer.send('app:request-exit'),
  onAppClose: (cb) => ipcRenderer.on('app-close', cb),

  // Logs desde renderer
  log: (level, message) => ipcRenderer.send('log-message', { level, message }),

  // Version (pide a main)
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  // CSP
  onUpdateCSP: (cb) => ipcRenderer.on('update-csp', (_e, csp) => cb(csp)),
  reloadApp: () => ipcRenderer.send('reload-app'),

  // Config y estado (main es quien observa archivos)
  getEnv: () => ipcRenderer.invoke('get-env'),
  onEnvUpdate: (cb) => ipcRenderer.on('env-updated', (_, d) => cb(d)),

  getConfig: () => ipcRenderer.invoke('get-config'),
  onConfigUpdate: (cb) => ipcRenderer.on('config-updated', (_, d) => cb(d)),

  getLogger: () => ipcRenderer.invoke('get-logger'),
  onLoggerUpdate: (cb) => ipcRenderer.on('logger-updated', (_, d) => cb(d)),

  getAuth: () => ipcRenderer.invoke('get-auth'),
  onAuthUpdate: (cb) => ipcRenderer.on('auth-updated', (_, d) => cb(d)),

  // Pantalla
  getScreenDataOnce: () => ipcRenderer.invoke('get-screen-data-once'),
  onScreenData: (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('screen-data', listener);
    return () => ipcRenderer.removeListener('screen-data', listener);
  },

  // Teclado virtual (si lo usas desde main)
  onFocusKeyboard: (cb) => ipcRenderer.on('focus-input-for-keyboard', cb),

  // TTS
  speak: (text, options) => ipcRenderer.invoke('tts-speak', text, options),
  stop: () => ipcRenderer.invoke('tts-stop'),
  getVoices: () => ipcRenderer.invoke('tts-get-voices'),

  // Ventana
  setFullScreen: (v) => ipcRenderer.send('set-fullscreen', v),
  setFrame: (v) => ipcRenderer.send('set-frame', v),
});
