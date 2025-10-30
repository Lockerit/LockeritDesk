import { useState, useRef, useMemo, useEffect, useCallback } from "react";

import { VirtualKeyboard } from "@shared/components/inputs/VirtualKeyboard";
import { logger } from "@shared/utils/logger.js";

import { KeyboardContext } from "./KeyboardContext";
import { useWindowSizeContext } from "./WindowSizeContext";

const fileName = "KeyboardProvider";
const log = logger.scope(fileName);

export const KeyboardProvider = ({ children }) => {
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeField, setActiveField] = useState(null);
    const [position, setPosition] = useState({ x: 100, y: 100 });

    const dragging = useRef(false);
    const offset = useRef({ x: 0, y: 0 });

    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const clamp = useCallback((v, min, max) => Math.max(min, Math.min(max, v)), []);

    const openKeyboard = useCallback(
        (anchorNode, fieldSetter, value, inputRef) => {
            const kbWidth = window.innerWidth * 0.9;
            const kbHeight = 300 * scale;

            let x = (window.innerWidth - kbWidth) / 2;
            let y = (window.innerHeight - kbHeight) / 2;

            let rectInfo = null;
            if (anchorNode?.getBoundingClientRect) {
                const rect = anchorNode.getBoundingClientRect();
                rectInfo = {
                    top: Math.round(rect.top),
                    left: Math.round(rect.left),
                    width: Math.round(rect.width),
                    height: Math.round(rect.height),
                    bottom: Math.round(rect.bottom),
                };

                if (rect.bottom + kbHeight < window.innerHeight) {
                    y = rect.bottom + 8;
                } else if (rect.top - kbHeight > 0) {
                    y = rect.top - kbHeight - 8;
                } else {
                    y = (window.innerHeight - kbHeight) / 2;
                }

                x = clamp(rect.left + rect.width / 2 - kbWidth / 2, 0, window.innerWidth - kbWidth);
            }

            setPosition({ x, y });
            setActiveField({ setValue: fieldSetter, value, inputRef, key: Date.now() });
            setShowKeyboard(true);

            log.info("abrir teclado", {
                anchor: rectInfo || "centered",
                pos: { x: Math.round(x), y: Math.round(y) },
                width: Math.round(kbWidth),
                height: Math.round(kbHeight),
            });
        },
        [clamp, scale]
    );

    const closeKeyboard = useCallback(() => {
        setShowKeyboard(false);
        setActiveField(null);
        log.info("cerrar teclado");
    }, []);

    // Mouse drag
    const onMouseMove = useCallback(
        (e) => {
            if (!dragging.current) return;

            const kbWidth = window.innerWidth * 0.9;
            const kbHeight = 300 * scale;
            const maxX = window.innerWidth - kbWidth;
            const maxY = window.innerHeight - kbHeight;

            const newX = clamp(e.clientX - offset.current.x, 0, maxX);
            const newY = clamp(e.clientY - offset.current.y, 0, maxY);
            setPosition({ x: newX, y: newY });
        },
        [clamp, scale]
    );

    const onMouseUp = useCallback(() => {
        if (!dragging.current) return;
        dragging.current = false;
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        log.info("drag fin (mouse)", { pos: { x: Math.round(position.x), y: Math.round(position.y) } });
    }, [onMouseMove, position.x, position.y]);

    const onMouseDown = useCallback(
        (e) => {
            dragging.current = true;
            offset.current = {
                x: e.clientX - position.x,
                y: e.clientY - position.y,
            };
            document.addEventListener("mousemove", onMouseMove);
            document.addEventListener("mouseup", onMouseUp);
            log.info("drag inicio (mouse)", { pos: { x: Math.round(position.x), y: Math.round(position.y) } });
        },
        [onMouseMove, onMouseUp, position.x, position.y]
    );

    // Touch drag
    const onTouchMove = useCallback(
        (e) => {
            if (!dragging.current) return;

            const t = e.touches[0];
            const kbWidth = window.innerWidth * 0.9;
            const kbHeight = 300 * scale;
            const maxX = window.innerWidth - kbWidth;
            const maxY = window.innerHeight - kbHeight;

            const newX = clamp(t.clientX - offset.current.x, 0, maxX);
            const newY = clamp(t.clientY - offset.current.y, 0, maxY);
            setPosition({ x: newX, y: newY });

            e.preventDefault();
        },
        [clamp, scale]
    );

    const onTouchEnd = useCallback(() => {
        if (!dragging.current) return;
        dragging.current = false;
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", onTouchEnd);
        log.info("drag fin (touch)", { pos: { x: Math.round(position.x), y: Math.round(position.y) } });
    }, [onTouchMove, position.x, position.y]);

    const onTouchStart = useCallback(
        (e) => {
            dragging.current = true;
            const t = e.touches[0];
            offset.current = {
                x: t.clientX - position.x,
                y: t.clientY - position.y,
            };
            document.addEventListener("touchmove", onTouchMove, { passive: false });
            document.addEventListener("touchend", onTouchEnd);
            log.info("drag inicio (touch)", { pos: { x: Math.round(position.x), y: Math.round(position.y) } });
        },
        [onTouchEnd, onTouchMove, position.x, position.y]
    );

    // Limpieza defensiva
    useEffect(() => {
        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("mouseup", onMouseUp);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            log.info("cleanup listeners");
        };
    }, [onMouseMove, onMouseUp, onTouchMove, onTouchEnd]);

    const ctxValue = useMemo(() => ({ openKeyboard, closeKeyboard }), [openKeyboard, closeKeyboard]);

    return (
        <KeyboardContext.Provider value={ctxValue}>
            {children}

            {showKeyboard && (
                <div
                    id="draggable-keyboard"
                    style={{
                        position: "fixed",
                        left: position.x,
                        top: position.y,
                        zIndex: 9999,
                        width: "90vw",
                        maxWidth: "90vw",
                        minWidth: `${320 * scale}px`,
                        background: "#f5f5f5",
                        borderRadius: 8 * scale,
                        boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                        border: `${1 * scale}px solid #0c315e`,
                        userSelect: "none",
                        padding: 8 * scale,
                    }}
                >
                    <div
                        onMouseDown={onMouseDown}
                        onTouchStart={onTouchStart}
                        style={{
                            width: "100%",
                            cursor: "move",
                            padding: 4,
                            fontWeight: "bold",
                            color: "#0c315e",
                            background: "#ffffff",
                            border: `${1 * scale}px solid #0c315e`,
                            borderRadius: 6 * scale,
                            marginBottom: 8 * scale,
                        }}
                    >
                        Arrastra para mover el teclado
                        <span
                            style={{ float: "right", cursor: "pointer", color: "#0c315e" }}
                            onClick={closeKeyboard}
                            aria-label="Cerrar teclado"
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
};
