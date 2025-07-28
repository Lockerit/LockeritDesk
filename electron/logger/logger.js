const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const fileName = path.parse(__filename).name;

const isProd = __dirname.includes('app.asar');
const basePath = isProd ? process.resourcesPath : path.join(__dirname, '..', '..');
const configPath = path.join(basePath, 'configFiles/logger_config.json');

// Configuración por defecto
let config = {
    logDirectory: 'logs',
    logLevel: 'info',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '10m',
    maxFiles: '14d'
};

// Cargar configuración desde JSON, si existe
try {
    if (fs.existsSync(configPath)) {
        const file = fs.readFileSync(configPath, 'utf8');
        config = { ...config, ...JSON.parse(file) };
    } else {
        console.warn(`[${fileName}] No se encontró logger_config.json, usando configuración por defecto`);
    }
} catch (err) {
    console.warn(`[${fileName}] Error leyendo logger_config.json, usando configuración por defecto: ${err.message}`);
}

// Asegurar ruta absoluta del directorio de logs
const logDir = path.join(basePath, 'logs');

if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

// Helper: Transport para consola
function getConsoleTransport() {
    return new transports.Console({
        format: format.combine(
            format.colorize(),
            format.printf(info => `[${info.timestamp}] [${info.level}] ${info.message}`)
        )
    });
}

// Helper: Transport rotativo
function getRotateTransport(cfg = config) {
    return new DailyRotateFile({
        filename: path.join(logDir, 'lockerit-%DATE%.log'),
        datePattern: cfg.datePattern,
        zippedArchive: cfg.zippedArchive,
        maxSize: cfg.maxSize,
        maxFiles: cfg.maxFiles
    });
}

// Crear instancia inicial del logger
let logger = createLogger({
    level: config.logLevel,
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(info => `[${info.timestamp}] [${info.level.toUpperCase()}] ${info.message}`)
    ),
    transports: [getConsoleTransport(), getRotateTransport()]
});

// Función para recargar el logger desde el archivo JSON
function reloadLoggerConfig() {
    try {
        const newConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        logger.level = newConfig.logLevel;
        logger.clear();
        logger.add(getConsoleTransport());
        logger.add(getRotateTransport(newConfig));
        config = newConfig;

        console.log(`[${fileName}] Configuración recargada dinámicamente`);

        if (global.mainWindow?.webContents) {
            global.mainWindow.webContents.send('logger-update', newConfig);
        }

    } catch (err) {
        console.error(`[${fileName}] Error al recargar configuración del logger: ${err.message}`);
    }
}

// Activar observador del archivo JSON
fs.watchFile(configPath, { interval: 1000 }, () => {
    console.log(`[${fileName}] Cambio detectado en logger_config.json`);
    reloadLoggerConfig();
});

module.exports = {
    logger,
    getLoggerConfig: () => config,
    reloadLoggerConfig
};
