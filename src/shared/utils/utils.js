// src/utils/timeUtils.js
import { getConfig } from '@shared/hooks/configStore.js';

const config = getConfig();

export const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatNumberPhone = (numberPhone) => {
    if (numberPhone == null) return '';          // null / undefined

    const value = String(numberPhone);           // asegura string
    const clean = value.replace(/\D/g, '');      // solo dígitos

    if (clean.length !== 10) return value;       // si no son 10, devuelves tal cual

    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
};

export const anotherUtil = (value) => {
    return value.toUpperCase();
};

export const phoneRegex = /^3\d{9}$/;

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const keys = () => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 'Borrar', 0, 'Cancelar', 'Aceptar'];
}

export const formatCurrency = (value, { onlyThousands = false } = {}) => {
    const number = Number(value);
    if (isNaN(number)) {
        return value; // Devuelve el original si no es número
    }

    const currencyCode = config?.paramsHtml?.currency?.currency || 'COP';
    const decimal = config?.paramsHtml?.currency?.decimal ?? 0;

    try {
        if (onlyThousands) {
            // Solo separadores de miles, sin símbolo
            return new Intl.NumberFormat('es-CO', {
                minimumFractionDigits: decimal,
                maximumFractionDigits: decimal,
                useGrouping: true,
            }).format(number);
        }

        // Caso normal: moneda con símbolo
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: decimal,
        }).format(number);
    } catch (err) {
        console.error('Error formateando moneda:', err);
        return number.toLocaleString('es-CO');
    }
};





