// voiceService.js

let voices = [];

// Cargar voces disponibles
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
};

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

/**
 * Hablar un texto con las opciones especificadas
 * @param {string} text - Texto a pronunciar
 * @param {Object} options - Opciones de voz
 * @param {string} [options.voiceName] - Nombre exacto de la voz
 * @param {number} [options.rate=1] - Velocidad (0.1 - 10)
 * @param {number} [options.pitch=1] - Tono (0 - 2)
 * @param {number} [options.volume=1] - Volumen (0 - 1)
 */
export const speak = (text, { voiceName, rate = 1.5, pitch = 2, volume = 1 } = {}) => {
    if (!window.speechSynthesis) {
        console.warn('API de síntesis de voz no disponible');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    if (voiceName) {
        const voice = voices.find(v => v.name === voiceName);
        if (voice) utterance.voice = voice;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = volume;

    window.speechSynthesis.speak(utterance);
};
