// voiceService.js

let voices = [];
let defaultOptions = {
    voiceName: null,
    rate: 1,
    pitch: 1,
    volume: 1
};

let voicesReady = null;
const isWindows = navigator.userAgent.includes("Windows");

/**
 * Cargar voces disponibles
 */
const loadVoices = () => {
    if (!window.speechSynthesis) return;
    voices = window.speechSynthesis.getVoices();
    if (voices.length > 0 && voicesReady) {
        voicesReady(voices);
        voicesReady = null; // solo resolvemos una vez
    }
};

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

/**
 * Asegura que las voces están listas antes de usarlas
 */
const waitForVoices = () => {
    if (voices.length > 0) return Promise.resolve(voices);
    return new Promise(resolve => {
        voicesReady = resolve;
    });
};

/**
 * Configurar opciones por defecto de voz
 */
export const setVoiceOptions = (options = {}) => {
    defaultOptions = { ...defaultOptions, ...options };
};

/**
 * Precalentar el motor TTS para evitar delay en la primera reproducción
 */
export const preloadVoice = () => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(" ");
    utterance.volume = 0; // que no suene
    window.speechSynthesis.speak(utterance);
    window.speechSynthesis.cancel();
};

/**
 * Hablar un texto
 */
export const speak = async (text, options = {}) => {
    const finalOptions = { ...defaultOptions, ...options };
    const {
        voiceName,
        rate,
        pitch,
        volume,
        useDesktopVoice,   // viene desde la config
    } = finalOptions;

    const canUseDesktop =
        isWindows &&
        !!useDesktopVoice &&
        !!window.electronAPI?.speak;

    // 1) Voces de escritorio (Windows/SAPI) si así lo pide la config
    if (canUseDesktop) {
        window.electronAPI.speak(text, {
            voiceName,
            rate,
            pitch,
            volume,
        });
        return;
    }

    // 2) Voces del navegador si hay speechSynthesis
    if (window.speechSynthesis) {
        await waitForVoices();

        const utterance = new SpeechSynthesisUtterance(text);

        if (voiceName) {
            const voice = voices.find(v => v.name === voiceName);
            if (voice) utterance.voice = voice;
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        // no ponemos onerror con fallback para que cancel() no dispare doble audio
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        return;
    }

    // 3) Fallback: si no hay speechSynthesis, usar backend si está disponible
    if (window.electronAPI?.speak) {
        window.electronAPI.speak(text, { voiceName, rate, pitch, volume });
    }
};


/**
 * Detener cualquier lectura en curso
 */
export const stopSpeaking = () => {
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    if (window.electronAPI?.stop) {
        window.electronAPI.stop();
    }
};

/**
 * Obtener lista de voces disponibles
 */
export const getVoices = async () => {
    // Ahora también usa voces del navegador en Windows
    if (window.speechSynthesis) {
        await waitForVoices();
        return voices.map(v => ({
            name: v.name,
            lang: v.lang
        }));
    }

    if (window.electronAPI?.getVoices) {
        return await window.electronAPI.getVoices();
    }

    return [];
};
