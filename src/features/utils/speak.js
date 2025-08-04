// voiceService.js

let voices = [];
let defaultVoiceName = '';
let defaultRate = 1;
let defaultPitch = 1;
let defaultVolume = 1;

// Cargar voces (esto puede ser asincrónico)
const loadVoices = () => {
    voices = window.speechSynthesis.getVoices();
    if (voices.length && !defaultVoiceName) {
        defaultVoiceName = voices[0].name;
    }
};

// Suscribirse al evento de voces
window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

export const setVoiceOptions = ({ voiceName, rate, pitch, volume }) => {
    if (voiceName) defaultVoiceName = voiceName;
    if (rate !== undefined) defaultRate = rate;
    if (pitch !== undefined) defaultPitch = pitch;
    if (volume !== undefined) defaultVolume = volume;
};

export const speak = (text) => {
    if (!window.speechSynthesis) {
        console.warn('API de síntesis de voz no disponible');
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);

    const voice = voices.find(v => v.name === defaultVoiceName);
    if (voice) utterance.voice = voice;

    utterance.rate = defaultRate;
    utterance.pitch = defaultPitch;
    utterance.volume = defaultVolume;

    window.speechSynthesis.speak(utterance);
};
