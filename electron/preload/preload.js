// electron/preload/preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  exitApp: () => ipcRenderer.send('app:exit'),
  onFocusKeyboard: (cb) => ipcRenderer.on('focus-input-for-keyboard', cb),
  requestExit: () => ipcRenderer.send('app:request-exit'),

  // Config y estado (main es el que lee/observa)
  getEnv: () => ipcRenderer.invoke('get-env'),
  onEnvUpdate: (cb) => ipcRenderer.on('env-updated', (_, d) => cb(d)),
  getConfig: () => ipcRenderer.invoke('get-config'),
  onConfigUpdate: (cb) => ipcRenderer.on('config-updated', (_, d) => cb(d)),
  getLogger: () => ipcRenderer.invoke('get-logger'),
  onLoggerUpdate: (cb) => ipcRenderer.on('logger-updated', (_, d) => cb(d)),
  getAuth: () => ipcRenderer.invoke('get-auth'),
  onAuthUpdate: (cb) => ipcRenderer.on('auth-updated', (_, d) => cb(d)),

  // Utilidades
  log: (level, message) => ipcRenderer.send('log-message', { level, message }),
  getAppVersion: () => {
    try { return require('../../package.json').version; } catch { return '0.0.0'; }
  },
  onUpdateCSP: (cb) => ipcRenderer.on('update-csp', (_e, csp) => cb(csp)),
  reloadApp: () => ipcRenderer.send('reload-app'),

  // Pantalla
  getScreenDataOnce: () => ipcRenderer.invoke('get-screen-data-once'),
  onScreenData: (cb) => {
    const listener = (_, data) => cb(data);
    ipcRenderer.on('screen-data', listener);
    return () => ipcRenderer.removeListener('screen-data', listener);
  },

  // TTS
  speak: (text, options) => ipcRenderer.invoke('tts-speak', text, options),
  stop: () => ipcRenderer.invoke('tts-stop'),
  getVoices: () => ipcRenderer.invoke('tts-get-voices'),

  // Ventana
  setFullScreen: (v) => ipcRenderer.send('set-fullscreen', v),
  setFrame: (v) => ipcRenderer.send('set-frame', v),
  onAppClose: (cb) => ipcRenderer.on('app-close', cb),
});
