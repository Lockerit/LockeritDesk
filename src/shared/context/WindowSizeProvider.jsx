// src/shared/context/WindowSizeProvider.jsx
import { useState, useEffect, useRef } from "react";

import { logger } from "@shared/utils/logger.js";

import { WindowSizeContext } from "./WindowSizeContext.jsx";

const fileName = "WindowSizeProvider";
const log = logger.scope(fileName);

function calcFactor(width, height) {
    const isPortrait = height > width;
    const baseWidth = isPortrait ? 1080 : 1920;
    const baseHeight = isPortrait ? 1920 : 1080;
    const scaleW = width / baseWidth;
    const scaleH = height / baseHeight;
    const factor = Math.min(scaleW, scaleH);
    return {
        width,
        height,
        orientation: isPortrait ? "portrait" : "landscape",
        factor: parseFloat(factor.toFixed(2)),
    };
}

// Debounce simple
function debounce(fn, ms) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), ms);
    };
}

export const WindowSizeProvider = ({ children, initialSize }) => {
    // Usa initialSize solo al inicio; si no viene, usa el viewport actual
    const [size, setSize] = useState(() =>
        initialSize
            ? calcFactor(initialSize.width, initialSize.height)
            : calcFactor(window.innerWidth, window.innerHeight)
    );

    const prevRef = useRef(size);

    useEffect(() => {
        log.info("mounted", {
            width: size.width,
            height: size.height,
            orientation: size.orientation,
            factor: size.factor,
        });
        return () => log.info("unmounted");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Log cuando cambian orientación o factor de forma significativa
    useEffect(() => {
        const prev = prevRef.current;
        const orientationChanged = prev.orientation !== size.orientation;
        const factorDelta = Math.abs((size.factor ?? 0) - (prev.factor ?? 0));

        if (orientationChanged || factorDelta >= 0.01) {
            log.info("resize", {
                width: size.width,
                height: size.height,
                orientation: size.orientation,
                factor: size.factor,
            });
            prevRef.current = size;
        }
    }, [size]);

    useEffect(() => {
        const onResize = debounce(() => {
            setSize(calcFactor(window.innerWidth, window.innerHeight));
        }, 150);

        window.addEventListener("resize", onResize);

        // Suscripción a Electron (si existe)
        let unsubscribe;
        if (window.electronAPI?.onScreenData) {
            unsubscribe = window.electronAPI.onScreenData((newSize) => {
                const next = calcFactor(newSize.width, newSize.height);
                setSize(next);
                // Log inmediato para eventos de Electron (menos frecuentes)
                log.info("screenData", {
                    width: next.width,
                    height: next.height,
                    orientation: next.orientation,
                    factor: next.factor,
                });
            });
            log.info("electron.onScreenData.subscribed");
        } else {
            log.debug?.("electron.onScreenData.unavailable");
        }

        return () => {
            window.removeEventListener("resize", onResize);
            if (typeof unsubscribe === "function") {
                try {
                    unsubscribe();
                    log.info("electron.onScreenData.unsubscribed");
                } catch {
                    /* noop */
                }
            }
        };
    }, []);

    return (
        <WindowSizeContext.Provider value={size}>
            {children}
        </WindowSizeContext.Provider>
    );
};
