// electron/main/tts.win.js
import { execFile } from 'node:child_process';

import say from 'say';

let log = console;
let speaking = false;
const queue = [];
let fallbackToPS = false;
let psChild = null;

export function initWindowsTTS(logger) {
    log = logger || console;
}

export function speak(text, opts = {}) {
    const item = {
        text: String(text ?? ''),
        rate: typeof opts.rate === 'number' ? opts.rate : 1,
        voiceName: opts.voiceName || null,
    };
    queue.push(item);
    if (!speaking) playNext();
}

export function stop({ flush = false } = {}) {
    try { say.stop(); } catch (error) { log.warn(`[tts.win] say.stop error: ${error?.message || error}`); }
    if (psChild && !psChild.killed) {
        try { psChild.kill('SIGKILL'); } catch (error) { log.warn(`[tts.win] psChild.kill error: ${error?.message || error}`); }
    }
    if (flush) queue.length = 0;
    speaking = false;
}

export function getVoices() {
    return new Promise((resolve) => {
        say.getInstalledVoices((err, voices) => {
            if (err || !voices) return resolve([]);
            resolve(voices.map(v => ({ name: v, lang: v.toLowerCase().includes('spanish') ? 'es' : 'en' })));
        });
    });
}

function playNext() {
    const item = queue.shift();
    if (!item) { speaking = false; return; }
    speaking = true;

    if (fallbackToPS) {
        psSpeak(item, onDone);
        return;
    }

    const { text, rate, voiceName } = item;

    try {
        say.speak(text, voiceName || undefined, rate, (err) => {
            if (err) {
                log.warn(`[tts.win] say.speak error: ${err?.message || err}, usando PowerShell`);
                fallbackToPS = true;
                return psSpeak(item, onDone);
            }
            onDone();
        });
    } catch (e) {
        log.warn(`[tts.win] say.speak throw: ${e?.message || e}, usando PowerShell`);
        fallbackToPS = true;
        psSpeak(item, onDone);
    }
}

function onDone() {
    speaking = false;
    playNext();
}

function psSpeak(item, cb) {
    const sapiRate = Math.max(-10, Math.min(10, Math.round((item.rate - 1) * 10)));
    const base64 = Buffer.from(item.text, 'utf8').toString('base64');
    const voicePart = item.voiceName
        ? `try{$s.SelectVoice('${escapeForPS(item.voiceName)}')}catch{}` : '';

    const psCmd = `
Add-Type -AssemblyName System.Speech
$s=New-Object System.Speech.Synthesis.SpeechSynthesizer
${voicePart}
$s.Rate=${sapiRate}
$t=[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${base64}'))
$s.Speak($t)
`.trim();

    psChild = execFile('powershell.exe', ['-NoLogo', '-NoProfile', '-Command', psCmd],
        { windowsHide: true },
        () => { psChild = null; cb(); }
    );
}

function escapeForPS(s) {
    return String(s).replace(/'/g, "''");
}

export const ttsWin = { initWindowsTTS, speak, stop, getVoices };
