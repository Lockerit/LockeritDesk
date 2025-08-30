// windowSizeContext.jsx
import { createContext, useContext, useState, useEffect } from "react";

const WindowSizeContext = createContext(null);

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
    // ⚡ usamos SOLO el initialSize al inicio
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

        if (window.electronAPI?.onScreenData) {
            const unsubscribe = window.electronAPI.onScreenData((newSize) => {
                setSize(calcFactor(newSize.width, newSize.height));
            });
            return () => {
                window.removeEventListener("resize", handleResize);
                if (unsubscribe) unsubscribe();
            };
        }

        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []); // 👈 este efecto ya NO recalcula al inicio

    return (
        <WindowSizeContext.Provider value={size}>
            {children}
        </WindowSizeContext.Provider>
    );
};

export const useWindowSizeContext = () => {
    const ctx = useContext(WindowSizeContext);
    if (!ctx) {
        throw new Error("useWindowSizeContext debe usarse dentro de <WindowSizeProvider>");
    }
    return ctx;
};
