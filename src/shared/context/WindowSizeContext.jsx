// src/shared/context/WindowSizeContext.jsx
import { createContext, useContext } from "react";

export const WindowSizeContext = createContext(null);

export const useWindowSizeContext = () => {
    const ctx = useContext(WindowSizeContext);
    if (!ctx) {
        throw new Error("useWindowSizeContext debe usarse dentro de <WindowSizeProvider>");
    }
    return ctx;
};
