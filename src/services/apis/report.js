import { API_ROUTES } from '@shared/constants/pathService.js';
import { getEnv } from '@shared/hooks/envStore.js';

import { instanceAxios } from './axiosConfig.js';

const fileName = 'reportLockers'; // Nombre del archivo para los logs

const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};
export const GetReportLockers = async (payload) => {
    log('info', 'Iniciando petición para obtener el reporte de casilleros');

    const env = getEnv(); // Se actualiza si .env cambió

    // Usa valores por defecto cuando las claves no existan (en segundos) y luego conviértelos a ms
    const effectiveTimeout = Number(env?.apiBaseTimeout ?? 30) * 1000;       // 30s por defecto
    const maxRetries = Number(env?.apiBaseMaxRetries ?? 5);            // 5 intentos por defecto
    const retryDelay = Number(env?.apiBaseDelayRetries ?? 1) * 1000;   // 1s por defecto

    log('info', `Timeout efectivo en ejecución: ${effectiveTimeout}`);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            log('info', `Intento ${attempt}: HOST -> ${instanceAxios.getUri()}`);
            log('info', `Intento ${attempt}: URL -> ${API_ROUTES.REPORT_LOCKERS}`);
            log('info', `Intento ${attempt}: Request -> ${JSON.stringify(payload)}`);

            const response = await instanceAxios.post(API_ROUTES.REPORT_LOCKERS, payload, { timeout: effectiveTimeout });

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