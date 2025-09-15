// voiceService.js

let voices = [];

// Cargar voces disponibles de speechSynthesis (Chromium/Windows/macOS)
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
 * Hablar un texto
 * @param {string} text 
 * @param {Object} options 
 * @param {string} [options.voiceName] - nombre de la voz
 * @param {number} [options.rate=1]   - velocidad
 * @param {number} [options.pitch=1]  - tono
 * @param {number} [options.volume=1] - volumen
 */
export const speak = (text, { voiceName, rate = 1, pitch = 1, volume = 1 } = {}) => {
    const isWindows = navigator.userAgent.includes("Windows");
    const hasVoices = window.speechSynthesis && voices.length > 0;

    // 🔹 Mapear alias a tokens reales
    const VOICE_ALIASES = {
        "Microsoft Sabina - Spanish (Mexico)": "MSTTS_V110_esMX_SabinaM",
        "Microsoft Raul - Spanish (Mexico)": "MSTTS_V110_esMX_RaulMM",
        "Sabina (Linux)": "mb-es3",
        "Raul (Linux)": "mb-es2"
    };
    const mappedVoiceName = VOICE_ALIASES[voiceName] || voiceName;

    if (hasVoices && !isWindows) {
        // ✅ speechSynthesis solo en macOS/Linux con Chromium
        const utterance = new SpeechSynthesisUtterance(text);

        if (mappedVoiceName) {
            const voice = voices.find(v => v.name === mappedVoiceName);
            if (voice) utterance.voice = voice;
        }

        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        window.speechSynthesis.speak(utterance);
    } else if (window.electronAPI?.speak) {
        // ✅ Windows siempre pasa por IPC con say
        window.electronAPI.speak(text, { voiceName: mappedVoiceName, rate });
    } else {
        console.warn("No hay TTS disponible (ni speechSynthesis ni electronAPI)");
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

export const getVoices = async () => {
    if (window.speechSynthesis) {
        // Voces de speechSynthesis (Windows/macOS con Chromium)
        return window.speechSynthesis.getVoices().map(v => ({
            name: v.name,
            lang: v.lang
        }));
    } else if (window.electronAPI?.getVoices) {
        // Voces de espeak (Linux)
        return await window.electronAPI.getVoices();
    }
    return [];
};
