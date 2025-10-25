// src/shared/context/UserContext.js
import { createContext, useContext } from "react";

export const UserContext = createContext(null);

// Hook de conveniencia
export const useUser = () => {
    const ctx = useContext(UserContext);
    if (!ctx) {
        throw new Error("useUser debe usarse dentro de <UserProvider>.");
    }
    return ctx;
};

// (Opcional) clave compartida de localStorage
export const USER_STORAGE_KEY = "userInit";
