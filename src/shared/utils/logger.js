// src/utils/logger.js
const VALID_LEVELS = ['error', 'warn', 'info', 'debug', 'verbose', 'silly'];
const SAFE_SCOPE = (s) => (typeof s === 'string' && s.trim()) ? s : 'renderer';

// Parse simple del primer frame útil del stack (archivo:línea:columna y función)
function captureCallsite(skip = 2) {
    try {
        const err = new Error();
        const stack = String(err.stack || '').split('\n').slice(skip); // salta call() y scope()
        const line = stack.find(l => l.includes('.js') || l.includes('.jsx') || l.includes('.ts') || l.includes('.tsx')) || stack[0];
        if (!line) return { stack };
        // Ejemplos de línea:
        // at fnName (C:\repo\src\App.jsx:123:45)
        // at C:\repo\src\App.jsx:123:45
        const m = line.match(/\(?(.+?):(\d+):(\d+)\)?/);
        const funcMatch = line.match(/at\s+([^\s(]+)\s*\(/);
        return {
            stack,
            at: {
                file: m?.[1],
                line: m ? Number(m[2]) : undefined,
                column: m ? Number(m[3]) : undefined,
                function: funcMatch?.[1]
            }
        };
    } catch { return {}; }
}

function safeLevel(level) { return VALID_LEVELS.includes(level) ? level : 'info'; }
function safeMsg(message) { return typeof message === 'string' ? message : String(message); }
function safeMeta(meta) { return (meta && typeof meta === 'object') ? meta : undefined; }

function call(level, scope, messageOrError, meta) {
    const lvl = safeLevel(level);
    const scp = SAFE_SCOPE(scope);

    let msg = '';
    let mdata = {};
    if (messageOrError instanceof Error) {
        msg = messageOrError.message || 'Error';
        mdata = { error: { name: messageOrError.name, message: messageOrError.message, stack: messageOrError.stack } };
    } else {
        msg = safeMsg(messageOrError);
    }

    const callsite = captureCallsite(); // añade archivo/linea
    const payloadMeta = { ...callsite, ...mdata, ...safeMeta(meta) };

    try {
        if (window?.electronAPI?.log) {
            return window.electronAPI.log(lvl, msg, payloadMeta, scp);
        }
    } catch { /* noop */ }
}

export const logger = {
    scope: (scope) => ({
        error: (m, meta) => call('error', scope, m, meta),
        warn: (m, meta) => call('warn', scope, m, meta),
        info: (m, meta) => call('info', scope, m, meta),
        debug: (m, meta) => call('debug', scope, m, meta),
        verbose: (m, meta) => call('verbose', scope, m, meta),
        silly: (m, meta) => call('silly', scope, m, meta),
    }),
    error: (m, meta) => call('error', 'renderer', m, meta),
    warn: (m, meta) => call('warn', 'renderer', m, meta),
    info: (m, meta) => call('info', 'renderer', m, meta),
    debug: (m, meta) => call('debug', 'renderer', m, meta),
    verbose: (m, meta) => call('verbose', 'renderer', m, meta),
    silly: (m, meta) => call('silly', 'renderer', m, meta),
};
