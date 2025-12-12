import { useTheme } from '@mui/material/styles';
import {
    useState,
    useRef,
    useMemo,
    useEffect,
    useCallback,
} from 'react';
import { createPortal } from 'react-dom';

import { VirtualKeyboard } from '@shared/components/inputs/VirtualKeyboard';
import { logger } from '@shared/utils/logger.js';

import { KeyboardContext } from './KeyboardContext';

const log = logger.scope('KeyboardProvider');
const LS_KEY = 'vk.position.v1';

// Constantes de tamaño del teclado
const KB_MIN_WIDTH = 320;     // px
const KB_MIN_HEIGHT = 220;    // px
const KB_BASE_HEIGHT = 300;   // px
const KB_MAX_WIDTH_RATIO = 0.9; // 90% del ancho

export const KeyboardProvider = ({ children, usePortal = true }) => {
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [activeField, setActiveField] = useState(null);

    const theme = useTheme();

    // Posición en píxeles, persistente
    const [position, setPosition] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
            if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) {
                return saved;
            }
        } catch {
            /* noop */
        }
        return { x: 100, y: 100 };
    });

    // Métricas del teclado
    const kbWidthRef = useRef(0);
    const kbHeightRef = useRef(0);

    // Drag state
    const draggingRef = useRef(false);
    const offsetRef = useRef({ x: 0, y: 0 });
    const posRef = useRef(position);
    const rafRef = useRef(null);

    const clamp = useCallback(
        (v, min, max) => Math.max(min, Math.min(max, v)),
        []
    );

    const computeMaxXY = useCallback(() => {
        const winW = window.innerWidth || 0;
        const winH = window.innerHeight || 0;

        const w = Math.min(winW * KB_MAX_WIDTH_RATIO, winW);
        const baseH = Math.max(KB_BASE_HEIGHT, KB_MIN_HEIGHT);
        const h = Math.min(baseH, winH * 0.8); // que no ocupe más del 80% del alto

        kbWidthRef.current = w;
        kbHeightRef.current = h;

        return {
            maxX: winW - w,
            maxY: winH - h,
        };
    }, []);

    const setPosClamped = useCallback(
        (x, y) => {
            const { maxX, maxY } = computeMaxXY();
            const nx = clamp(x, 0, Math.max(0, maxX));
            const ny = clamp(y, 0, Math.max(0, maxY));
            posRef.current = { x: nx, y: ny };
            setPosition(posRef.current);
        },
        [clamp, computeMaxXY]
    );

    const openKeyboard = useCallback(
        (anchorNode, fieldSetter, value, inputRef) => {
            // Calcular posición inicial
            computeMaxXY();
            let x;
            let y;

            if (anchorNode?.getBoundingClientRect) {
                const rect = anchorNode.getBoundingClientRect();
                const kbW = kbWidthRef.current || KB_MIN_WIDTH;
                const kbH = kbHeightRef.current || KB_BASE_HEIGHT;

                if (rect.bottom + kbH < window.innerHeight) {
                    y = rect.bottom + 8;
                } else if (rect.top - kbH > 0) {
                    y = rect.top - kbH - 8;
                } else {
                    y = (window.innerHeight - kbH) / 2;
                }
                x = clamp(
                    rect.left + rect.width / 2 - kbW / 2,
                    0,
                    window.innerWidth - kbW
                );
            } else {
                const kbW = kbWidthRef.current || KB_MIN_WIDTH;
                const kbH = kbHeightRef.current || KB_BASE_HEIGHT;
                x = (window.innerWidth - kbW) / 2;
                y = (window.innerHeight - kbH) / 2;
            }

            setPosClamped(x, y);
            setActiveField({
                setValue: fieldSetter,
                value,
                inputRef,
                key: Date.now(),
            });
            setShowKeyboard(true);

            log.debug(
                `keyboard.open, { x: ${Math.round(x)}, y: ${Math.round(y)} }`
            );
        },
        [clamp, computeMaxXY, setPosClamped]
    );

    const closeKeyboard = useCallback(() => {
        setShowKeyboard(false);
        setActiveField(null);
        log.debug('keyboard.close');
    }, []);

    // Persistir posición
    useEffect(() => {
        try {
            localStorage.setItem(LS_KEY, JSON.stringify(position));
        } catch {
            /* noop */
        }
    }, [position]);

    // Re-clamp al cambiar tamaño/orientación
    useEffect(() => {
        const onResize = () => {
            computeMaxXY();
            setPosClamped(posRef.current.x, posRef.current.y);
        };
        window.addEventListener('resize', onResize, { passive: true });
        window.addEventListener('orientationchange', onResize, { passive: true });
        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
        };
    }, [computeMaxXY, setPosClamped]);

    // Cerrar con Escape
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === 'Escape' && showKeyboard) closeKeyboard();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [showKeyboard, closeKeyboard]);

    // Pointer Events: down/move/up
    const onPointerDown = useCallback((e) => {
        if (
            e.target.closest('[data-nodrag]') ||
            e.target.closest('button, a, input, textarea, select')
        ) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        draggingRef.current = true;
        offsetRef.current = {
            x: e.clientX - posRef.current.x,
            y: e.clientY - posRef.current.y,
        };
        e.currentTarget.setPointerCapture?.(e.pointerId);
        log.debug(
            `drag.start, { x: ${Math.round(posRef.current.x)}, y: ${Math.round(
                posRef.current.y
            )} }`
        );
    }, []);

    const schedulePos = useCallback(
        (nx, ny) => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            rafRef.current = requestAnimationFrame(() => setPosClamped(nx, ny));
        },
        [setPosClamped]
    );

    const onPointerMove = useCallback(
        (e) => {
            if (!draggingRef.current) return;
            e.preventDefault();

            const { maxX, maxY } = computeMaxXY();
            const nx = clamp(
                e.clientX - offsetRef.current.x,
                0,
                Math.max(0, maxX)
            );
            const ny = clamp(
                e.clientY - offsetRef.current.y,
                0,
                Math.max(0, maxY)
            );
            schedulePos(nx, ny);
        },
        [clamp, computeMaxXY, schedulePos]
    );

    const onPointerUp = useCallback((e) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        e.preventDefault();
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        log.debug(
            `drag.end, { x: ${Math.round(posRef.current.x)}, y: ${Math.round(
                posRef.current.y
            )} }`
        );
    }, []);

    // Limpieza defensiva
    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const ctxValue = useMemo(
        () => ({ openKeyboard, closeKeyboard }),
        [openKeyboard, closeKeyboard]
    );

    const keyboardNode = showKeyboard ? (
        <div
            id="draggable-keyboard"
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: theme.zIndex.modal + 2,
                pointerEvents: 'none',
            }}
            aria-hidden={!showKeyboard}
        >
            <div
                style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    width: '90vw',
                    maxWidth: '90vw',
                    minWidth: `${KB_MIN_WIDTH}px`,
                    pointerEvents: 'auto',
                    background: theme.palette.background.paper,
                    borderRadius: theme.shape.borderRadius * 2,
                    boxShadow: theme.shadows[6],
                    border: `1px solid ${theme.palette.secondary.main}`,
                    userSelect: 'none',
                    padding: theme.spacing(1),
                    touchAction: 'none',
                }}
            >
                <div
                    role="button"
                    aria-label="Mover teclado virtual"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{
                        width: '100%',
                        cursor: 'grab',
                        padding: theme.spacing(0.5),
                        fontWeight: theme.typography.fontWeightBold,
                        color: theme.palette.secondary.contrastText,
                        background: theme.palette.secondary.main,
                        border: `1px solid ${theme.palette.secondary.main}`,
                        borderRadius: theme.shape.borderRadius * 1.5,
                        marginBottom: theme.spacing(1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
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
                            marginLeft: theme.spacing(1),
                            cursor: 'pointer',
                            color: theme.palette.secondary.contrastText,
                            background: 'transparent',
                            border: 'none',
                            fontSize: theme.typography.body1.fontSize,
                            fontWeight: theme.typography.fontWeightBold,
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
            {usePortal
                ? createPortal(keyboardNode, document.body)
                : keyboardNode}
        </KeyboardContext.Provider>
    );
};
