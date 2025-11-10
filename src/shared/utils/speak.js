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
const hasElectron = !!(window.electronAPI?.speak);

const fileName = "speak";

// Función auxiliar para loguear si está disponible
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

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
    const { voiceName, rate, pitch, volume } = finalOptions;

    if (window.speechSynthesis && (!isWindows || !hasElectron)) {
        await waitForVoices();

        const utterance = new SpeechSynthesisUtterance(text);

        if (voiceName) {
            const voice = voices.find(v => v.name === voiceName);
            if (voice) utterance.voice = voice;
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    } else if (hasElectron) {
        window.electronAPI.speak(text, { voiceName, rate, pitch, volume });
    } else {
        log("warn", "No hay TTS disponible (ni speechSynthesis ni electronAPI)");
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
    if (window.speechSynthesis && !navigator.userAgent.includes("Windows")) {
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
