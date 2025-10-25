// src/shared/context/WindowSizeProvider.jsx
import { useState, useEffect } from "react";

import { WindowSizeContext } from "./WindowSizeContext.jsx";

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

export const WindowSizeProvider = ({ children, initialSize }) => {
    // Usa initialSize solo al inicio; si no viene, usa el viewport actual
    const [size, setSize] = useState(() =>
        initialSize
            ? calcFactor(initialSize.width, initialSize.height)
            : calcFactor(window.innerWidth, window.innerHeight)
    );

    useEffect(() => {
        const handleResize = () => {
            setSize(calcFactor(window.innerWidth, window.innerHeight));
        };

        window.addEventListener("resize", handleResize);

        // Suscripción a Electron (si existe)
        let unsubscribe;
        if (window.electronAPI?.onScreenData) {
            unsubscribe = window.electronAPI.onScreenData((newSize) => {
                setSize(calcFactor(newSize.width, newSize.height));
            });
        }

        return () => {
            window.removeEventListener("resize", handleResize);
            if (typeof unsubscribe === "function") unsubscribe();
        };
    }, []);

    return (
        <WindowSizeContext.Provider value={size}>
            {children}
        </WindowSizeContext.Provider>
    );
};
