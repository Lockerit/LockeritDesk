
// KeyboardProvider.jsx
import { useState, createContext, useContext, useRef } from "react";
import VirtualKeyboard from "../utils/virtualKeyboard";
import { useWindowSizeContext } from "./windowSizeContext";

const KeyboardContext = createContext();

export function KeyboardProvider({ children }) {
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeField, setActiveField] = useState(null);
    const [position, setPosition] = useState({ x: 100, y: 100 });
    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    const openKeyboard = (anchorNode, fieldSetter, value, inputRef) => {
        // Calcula el ancho dinámicamente con escala
        const kbWidth = window.innerWidth * 0.9;
        const kbHeight = 300 * scale;
        let x = (window.innerWidth - kbWidth) / 2;
        let y = (window.innerHeight - kbHeight) / 2;
        if (anchorNode) {
            const rect = anchorNode.getBoundingClientRect();
            // Preferir abrir abajo del input si hay espacio, si no, arriba
            if (rect.bottom + kbHeight < window.innerHeight) {
                y = rect.bottom + 8; // 8px de separación
            } else if (rect.top - kbHeight > 0) {
                y = rect.top - kbHeight - 8;
            } else {
                // Si no cabe ni arriba ni abajo, centrar
                y = (window.innerHeight - kbHeight) / 2;
            }
            // Centrar horizontalmente respecto al input, pero sin salirse de la pantalla
            x = Math.max(0, Math.min(rect.left + rect.width / 2 - kbWidth / 2, window.innerWidth - kbWidth));
        }
        setPosition({ x, y });
        setActiveField({ setValue: fieldSetter, value, inputRef, key: Date.now() });
        setShowKeyboard(true);
    };

    const closeKeyboard = () => {
        setShowKeyboard(false);
        setActiveField(null);
    };

    // --- Drag logic ---
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const onMouseDown = (e) => {
        dragging.current = true;
        offset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y,
        };
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };
    const onMouseMove = (e) => {
        if (!dragging.current) return;
        const kbWidth = Math.floor(window.innerWidth * 0.9 * scale);
        const kbHeight = 300 * scale;
        const maxX = window.innerWidth - kbWidth;
        const maxY = window.innerHeight - kbHeight;
        const newX = clamp(e.clientX - offset.current.x, 0, maxX);
        const newY = clamp(e.clientY - offset.current.y, 0, maxY);
        setPosition({ x: newX, y: newY });
    };
    const onMouseUp = () => {
        dragging.current = false;
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    // Soporte para pantallas táctiles
    const onTouchStart = (e) => {
        dragging.current = true;
        const touch = e.touches[0];
        offset.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y,
        };
        document.addEventListener('touchmove', onTouchMove, { passive: false });
        document.addEventListener('touchend', onTouchEnd);
    };
    const onTouchMove = (e) => {
        if (!dragging.current) return;
        const touch = e.touches[0];
        const kbWidth = window.innerWidth * 0.9;
        const kbHeight = 300 * scale;
        const maxX = window.innerWidth - kbWidth;
        const maxY = window.innerHeight - kbHeight;
        const newX = clamp(touch.clientX - offset.current.x, 0, maxX);
        const newY = clamp(touch.clientY - offset.current.y, 0, maxY);
        setPosition({ x: newX, y: newY });
        e.preventDefault(); // Evita scroll mientras arrastras
    };
    const onTouchEnd = () => {
        dragging.current = false;
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
    };

    return (
        <KeyboardContext.Provider value={{ openKeyboard, closeKeyboard }}>
            {children}
            {showKeyboard && (
                <div
                    id="draggable-keyboard"
                    style={{
                        position: 'fixed',
                        left: position.x,
                        top: position.y,
                        zIndex: 9999,
                        width: '90vw',
                        maxWidth: '90vw',
                        minWidth: `${320 * scale}px`,
                        background: '#f5f5f5',
                        borderRadius: 8 * scale,
                        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                        border: `${1 * scale}px solid #0c315e`,
                        userSelect: 'none',
                        padding: 8 * scale,
                    }}
                >
                    <div
                        onMouseDown={onMouseDown}
                        onTouchStart={onTouchStart}
                        style={{
                            width: '100%',
                            cursor: 'move',
                            padding: 4,
                            fontWeight: 'bold',
                            color: '#0c315e',
                            background: '#ffffff',
                            border: `${1 * scale}px solid #0c315e`,
                            borderRadius: 6 * scale,
                            marginBottom: 8 * scale,
                        }}
                    >
                        Arrastra para mover el teclado
                        <span
                            style={{ float: 'right', cursor: 'pointer', color: '#0c315e' }}
                            onClick={closeKeyboard}
                        >
                            ✕
                        </span>
                    </div>
                    {activeField && (
                        <VirtualKeyboard
                            key={activeField.key}
                            inputValue={activeField.value}
                            onChange={(val) => activeField.setValue(val)}
                            onEnter={closeKeyboard}
                            activeField={activeField}
                        />
                    )}
                </div>
            )}
        </KeyboardContext.Provider>
    );
}

export const useKeyboard = () => useContext(KeyboardContext);
