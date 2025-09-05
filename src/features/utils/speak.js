// voiceService.js
import { exec } from 'child_process';

let voices = [];

// Cargar voces disponibles
const loadVoices = () => {
    if (window.speechSynthesis) {
        voices = window.speechSynthesis.getVoices();
    }
};
if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

/**
 * Hablar un texto con opciones
 * @param {string} text 
 * @param {Object} options
 * @param {string} [options.voiceName] Nombre exacto de la voz
 * @param {number} [options.rate=1] Velocidad
 * @param {number} [options.pitch=1] Tono
 * @param {number} [options.volume=1] Volumen
 */
export const speak = (text, { voiceName, rate = 1.5, pitch = 2, volume = 1 } = {}) => {
    if (window.speechSynthesis && voices.length > 0) {
        // Usar API web si hay voces
        const utterance = new SpeechSynthesisUtterance(text);

        if (voiceName) {
            const voice = voices.find(v => v.name === voiceName);
            if (voice) utterance.voice = voice;
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        window.speechSynthesis.speak(utterance);
    } else {
        // Fallback por sistema (Linux o macOS)
        let command;
        if (process.platform === 'linux') {
            // espeak: velocidad en palabras/min, -p pitch (0-99), -v voz
            command = `espeak -s ${Math.round(rate * 150)} -p ${Math.round(pitch * 50)} "${text.replace(/"/g, '\\"')}"`;
        } else if (process.platform === 'darwin') {
            // say: macOS
            command = `say "${text.replace(/"/g, '\\"')}"`;
        } else {
            console.warn('No hay síntesis de voz disponible en este sistema.');
            return;
        }

        exec(command, (err) => {
            if (err) console.error('Error al ejecutar TTS de sistema:', err);
        });
    }
};
