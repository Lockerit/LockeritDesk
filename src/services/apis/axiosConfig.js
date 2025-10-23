import axios from 'axios';

import { getAuth, subscribeAuth } from '@shared/hooks/authStore.js';
import { getEnv, subscribeEnv } from '@shared/hooks/envStore.js';

const fileName = 'axiosConfig';

const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

const env = getEnv();
const defaultURL = 'http://localhost:8080';

const baseURL =
    env?.apiBaseUrl && env?.apiBasePort
        ? `${env.apiBaseUrl}:${env.apiBasePort}`
        : defaultURL;

const timeout =
    env?.apiBaseTimeout ? env?.apiBaseTimeout : '30';

log('info', `API BaseURL Inicial: ${baseURL}`);
log('info', `API BaseTimeout Inicial: ${timeout}`);

// Configuración inicial
export const instanceAxios = axios.create({
    baseURL,
    timeout,
    headers: {
        'Content-Type': 'application/json'
    },
});

// Interceptor para insertar token actualizado dinámicamente
instanceAxios.interceptors.request.use(
    (config) => {
        const token = getAuth()?.key;
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
            log('debug', 'Token agregado al header');
        }
        return config;
    },
    (error) => {
        log('error', `Error en request interceptor: ${error.message}`);
        return Promise.reject(error);
    }
);

// Escucha cambios en .env para actualizar baseURL dinámicamente
subscribeEnv((env) => {
    if (env?.apiBaseUrl && env?.apiBasePort) {
        const newBaseURL = `${env.apiBaseUrl}:${env.apiBasePort}`;
        if (newBaseURL !== instanceAxios.defaults.baseURL) {
            log('info', `API BaseURL actualizada dinámicamente: ${newBaseURL}`);
            instanceAxios.defaults.baseURL = newBaseURL;
        }
    }

    if (env?.apiBaseTimeout) {
        const newTimeout =  Number(env.apiBaseTimeout);
        log('info', `API BaseTimeout actualizada dinámicamente: ${newTimeout}`);
        instanceAxios.defaults.timeout = newTimeout;
    }
});

// Suscribirse a cambios en el token de autenticación
subscribeAuth((auth) => {
    const newToken = auth?.key;
    if (newToken) {
        instanceAxios.defaults.headers['Authorization'] = `Bearer ${newToken}`;
        log('debug', 'Token actualizado en headers');
    } else {
        delete instanceAxios.defaults.headers['Authorization'];
        log('warn', 'Token eliminado de headers');
    }
});