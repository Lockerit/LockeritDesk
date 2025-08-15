import axios from './axiosConfig.js';
import API_ROUTES from '../router/pathService.js';
import { getEnv, subscribeEnv } from '../hooks/envStore.js';

const fileName = 'removeLocker'; // Nombre del archivo para los logs

const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

const OpenSessionLocker = async (payload) => {
    log('info', 'Iniciando petición para abrir casillero y retirar');

    const env = getEnv(); // Esto se actualiza si `.env` cambió
    const maxRetries = env?.apiBaseMaxRetries || 5;
    const retryDelay = (env?.apiBaseDelayRetries * 1000) || 1;

    const effectiveTimeout = Number((env?.apiBaseTimeout * 1000) ?? 30000);

    log('info', `Timeout efectivo en ejecución: ${effectiveTimeout}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log('info', `Intento ${attempt}: HOST -> ${axios.getUri()}`);
            log('info', `Intento ${attempt}: URL -> ${API_ROUTES.OPEN_SESSION_LOCKER}`);
            log('info', `Intento ${attempt}: Request -> ${JSON.stringify(payload)}`);

            const response = await axios.post(API_ROUTES.OPEN_SESSION_LOCKER, payload, { timeout: effectiveTimeout });

            log('info', `Response. Status: ${response.status}`);
            log('info', `Response. Data: ${JSON.stringify(response.data)}`);

            return {
                success: true,
                data: response.data,
                status: response.status,
            };

        } catch (error) {
            const status = error?.response?.status || 500;
            const msg = `Error HTTP: ${status} - ${error?.response?.data?.message || error.message}`;
            log('error', `[intento ${attempt}] ${msg}`);

            // Reintentar solo si es 500 y quedan intentos
            if (status === 500 && attempt < maxRetries) {
                log('warn', `Reintentando en ${retryDelay}ms...`);
                await new Promise(res => setTimeout(res, retryDelay));
            } else {
                return {
                    success: false,
                    data: error.response?.data || { message: msg },
                    status,
                };
            }
        }
    }
};

export default OpenSessionLocker;
