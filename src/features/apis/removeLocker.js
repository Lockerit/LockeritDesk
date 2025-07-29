import axios from './axiosConfig.js';
import API_ROUTES from '../router/pathService.js';
import { getEnv, subscribeEnv } from '../hooks/envStore.js';

const fileName = 'openbleLockers'; // Nombre del archivo para los logs

const log = (level, message) => {
    window.electronAPI?.log(level, `[${fileName}] ${message}`);
};

const RemoveLocker = async (payload) => {
    log('info', 'Iniciando petición para abrir casillero y retirar');

    const env = getEnv(); // Esto se actualiza si `.env` cambió
    const effectiveTimeout = Number(env?.apiBaseTimeout ?? 30000);

    log('info', `Timeout efectivo en ejecución: ${effectiveTimeout}`);

    try {
        log('info', `Request: ${JSON.stringify(payload)}`);
        const response = await axios.post(API_ROUTES.REMOVE_LOCKER, payload, { timeout: effectiveTimeout });
        log('info', `Response. Status: ${response.status}`);
        log('info', `Response. Data: ${JSON.stringify(response.data)}`);

        return {
            success: true,
            data: response.data,
            status: response.status,
        };

    } catch (error) {
        const msg = `Error HTTP: ${error?.response?.status || 'Sin código'} - ${error?.response?.data?.message || error.message}`;
        log('error', msg);

        return {
            success: false,
            data: error.response?.data || { message: msg },
            status: error.response?.status || 500,
        };
    }
};

export default RemoveLocker;
