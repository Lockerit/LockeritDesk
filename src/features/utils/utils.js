// src/utils/timeUtils.js
import { getConfig, subscribeConfig } from '../hooks/configStore.js';

const config = getConfig();

export const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatNumberPhone = (numberPhone) => {
    // Elimina todo lo que no sea dígito
    const clean = numberPhone.replace(/\D/g, '');

    // Asegura que tiene 10 dígitos
    if (clean.length !== 10) return numberPhone;

    return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6)}`;
}

export const anotherUtil = (value) => {
    return value.toUpperCase();
};

export const phoneRegex = () => {
    return /^3\d{9}$/;
}

export const keys = () => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 'Borrar', 0, 'Cancelar', 'Aceptar'];
}

export const formatCurrency = (value) => {
    // Asegúrate de que value es un número válido
    const number = Number(value);
    if (isNaN(number)) {
        return value; // Devuelve el original si no es número
    }

    const currencyCode = config?.params?.currency?.currency || 'COP';
    const decimal = config?.params?.currency?.decimal ?? 0;

    try {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: currencyCode,
            minimumFractionDigits: decimal,
        }).format(number);
    } catch (err) {
        return number.toLocaleString('es-CO');
    }
};




