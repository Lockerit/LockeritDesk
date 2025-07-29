import axios from './axiosConfig.js';
import API_ROUTES from '../router/pathService.js';
import { getEnv, subscribeEnv } from '../hooks/envStore.js';

const fileName = 'availableLockers'; // Nombre del archivo para los logs

const log = (level, message) => {
    window.electronAPI?.log(level, `[${fileName}] ${message}`);
};

const GetStatusLockers = async () => {
    log('info', 'Iniciando petición para obtener lockers disponibles');

    const env = getEnv(); // Esto se actualiza si `.env` cambió
    const effectiveTimeout = Number((env?.apiBaseTimeout * 1000) ?? 30000);

    log('info', `Timeout efectivo en ejecución: ${effectiveTimeout}`);

    try {
        const response = await axios.get(API_ROUTES.GET_LOCKERS_STATUS, {
            timeout: effectiveTimeout,
        });

        log('info', `Response. Status: ${response.status}`);
        log('info', `Response. Data: ${JSON.stringify(response.data)}`);

        return {
            success: true,
            data: response.data,
            status: response.status,
        };
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Error en la respuesta http del servidor. (001)';

        log('error', `Error HTTP: ${status} - ${message}`);
        log('debug', `Detalles del error: ${JSON.stringify(error)}`);

        return {
            success: false,
            data: error.response?.data || { message },
            status,
        };
    }
};

export default GetStatusLockers;
