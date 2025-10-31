import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import { VirtualKeyboard } from "@shared/components/inputs/VirtualKeyboard";
import { logger } from "@shared/utils/logger.js";
import { KeyboardContext } from "./KeyboardContext";
import { useWindowSizeContext } from "./WindowSizeContext";

const log = logger.scope("KeyboardProvider");
const LS_KEY = "vk.position.v1";

export const KeyboardProvider = ({ children, usePortal = true }) => {
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeField, setActiveField] = useState(null);

    // Posición en píxeles, persistente
    const [position, setPosition] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
            if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) return saved;
        } catch { }
        return { x: 100, y: 100 };
    });

    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    // Métricas del teclado
    const kbWidthRef = useRef(0);
    const kbHeightRef = useRef(0);

    // Drag state
    const draggingRef = useRef(false);
    const offsetRef = useRef({ x: 0, y: 0 });
    const posRef = useRef(position);
    const rafRef = useRef(null);

    const clamp = useCallback((v, min, max) => Math.max(min, Math.min(max, v)), []);

    const computeMaxXY = useCallback(() => {
        const w = Math.min(window.innerWidth * 0.9, window.innerWidth); // 90vw
        const h = Math.max(300 * scale, 220); // alto mínimo
        kbWidthRef.current = w;
        kbHeightRef.current = h;
        return {
            maxX: window.innerWidth - w,
            maxY: window.innerHeight - h,
        };
    }, [scale]);

    const setPosClamped = useCallback((x, y) => {
        const { maxX, maxY } = computeMaxXY();
        const nx = clamp(x, 0, Math.max(0, maxX));
        const ny = clamp(y, 0, Math.max(0, maxY));
        posRef.current = { x: nx, y: ny };
        setPosition(posRef.current);
    }, [clamp, computeMaxXY]);

    const openKeyboard = useCallback((anchorNode, fieldSetter, value, inputRef) => {
        // Calcular posición inicial (debajo o encima del anchor si es posible)
        computeMaxXY();
        let x, y;

        if (anchorNode?.getBoundingClientRect) {
            const rect = anchorNode.getBoundingClientRect();
            const kbW = kbWidthRef.current;
            const kbH = kbHeightRef.current;

            // Preferencia: debajo; si no cabe, encima; si no, centrado
            if (rect.bottom + kbH < window.innerHeight) {
                y = rect.bottom + 8;
            } else if (rect.top - kbH > 0) {
                y = rect.top - kbH - 8;
            } else {
                y = (window.innerHeight - kbH) / 2;
            }
            x = clamp(rect.left + rect.width / 2 - kbW / 2, 0, window.innerWidth - kbW);
        } else {
            // Centro
            x = (window.innerWidth - kbWidthRef.current) / 2;
            y = (window.innerHeight - kbHeightRef.current) / 2;
        }

        setPosClamped(x, y);
        setActiveField({ setValue: fieldSetter, value, inputRef, key: Date.now() });
        setShowKeyboard(true);

        log.debug(`keyboard.open, { x: ${Math.round(x)}, y: ${Math.round(y)} }`);
    }, [clamp, computeMaxXY, setPosClamped]);

    const closeKeyboard = useCallback(() => {
        setShowKeyboard(false);
        setActiveField(null);
        log.debug("keyboard.close");
    }, []);

    // Persistir posición
    useEffect(() => {
        localStorage.setItem(LS_KEY, JSON.stringify(position));
    }, [position]);

    // Re-clamp al cambiar tamaño/orientación
    useEffect(() => {
        const onResize = () => {
            computeMaxXY();
            setPosClamped(posRef.current.x, posRef.current.y);
        };
        window.addEventListener("resize", onResize, { passive: true });
        window.addEventListener("orientationchange", onResize, { passive: true });
        return () => {
            window.removeEventListener("resize", onResize);
            window.removeEventListener("orientationchange", onResize);
        };
    }, [computeMaxXY, setPosClamped]);

    // Cerrar con Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape" && showKeyboard) closeKeyboard();
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [showKeyboard, closeKeyboard]);

    // Pointer Events: down/move/up
    const onPointerDown = useCallback((e) => {
        // Si el click viene de algo interactivo, no iniciar drag
        if (
            e.target.closest('[data-nodrag]') ||
            e.target.closest('button, a, input, textarea, select')
        ) {
            return; // permite que onClick de la X funcione
        }

        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        offsetRef.current = {
            x: e.clientX - posRef.current.x,
            y: e.clientY - posRef.current.y,
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
        log.debug(`drag.start, { x: ${Math.round(posRef.current.x)}, y: ${Math.round(posRef.current.y)} }`);
    }, []);

    const schedulePos = useCallback((nx, ny) => {
        // Animación con RAF para evitar reflows excesivos
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => setPosClamped(nx, ny));
    }, [setPosClamped]);

    const onPointerMove = useCallback((e) => {
        if (!draggingRef.current) return;
        e.preventDefault();

        const { maxX, maxY } = computeMaxXY();
        const nx = clamp(e.clientX - offsetRef.current.x, 0, Math.max(0, maxX));
        const ny = clamp(e.clientY - offsetRef.current.y, 0, Math.max(0, maxY));
        schedulePos(nx, ny);
    }, [clamp, computeMaxXY, schedulePos]);

    const onPointerUp = useCallback((e) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        e.preventDefault();
        try { e.currentTarget.releasePointerCapture?.(e.pointerId); } catch { }
        log.debug(`drag.end, { x: ${Math.round(posRef.current.x)}, y: ${Math.round(posRef.current.y)} }`);
    }, []);

    // Limpieza defensiva
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const ctxValue = useMemo(() => ({ openKeyboard, closeKeyboard }), [openKeyboard, closeKeyboard]);

    const keyboardNode = showKeyboard ? (
        <div
            id="draggable-keyboard"
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                pointerEvents: "none", // contenedor no capta eventos excepto el panel
            }}
            aria-hidden={!showKeyboard}
        >
            <div
                style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    // Render sin jank
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    width: "90vw",
                    maxWidth: "90vw",
                    minWidth: `${320 * scale}px`,
                    pointerEvents: "auto", // este sí capta
                    background: "#f5f5f5",
                    borderRadius: 8 * scale,
                    boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                    border: `${1 * scale}px solid #0c315e`,
                    userSelect: "none",
                    padding: 8 * scale,
                    touchAction: "none", // evita scroll durante drag
                }}
            >
                <div
                    role="button"
                    aria-label="Mover teclado virtual"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{
                        width: "100%",
                        cursor: "grab",
                        padding: 4,
                        fontWeight: "bold",
                        color: "#0c315e",
                        background: "#ffffff",
                        border: `${1 * scale}px solid #0c315e`,
                        borderRadius: 6 * scale,
                        marginBottom: 8 * scale,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                    }}
                >
                    Arrastra para mover el teclado
                    <button
                        type="button"
                        data-nodrag
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={closeKeyboard}
                        aria-label="Cerrar teclado"
                        style={{
                            marginLeft: 8,
                            cursor: "pointer",
                            color: "#0c315e",
                            background: "transparent",
                            border: "none",
                            fontSize: 16 * scale,
                            fontWeight: "bold",
                        }}
                    >
                        ✕
                    </button>
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
        </div>
    ) : null;

    return (
        <KeyboardContext.Provider value={ctxValue}>
            {children}
            {usePortal ? createPortal(keyboardNode, document.body) : keyboardNode}
        </KeyboardContext.Provider>
    );
};
