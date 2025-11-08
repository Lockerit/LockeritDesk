// src/shared/context/UserProvider.jsx
import { useState } from "react";

import { UserContext, USER_STORAGE_KEY } from "./UserContext";

export const UserProvider = ({ children }) => {
    const [userInit, setUserInit] = useState(() => {
        try {
            const raw = localStorage.getItem(USER_STORAGE_KEY);
            if (!raw) {
                return {
                    authenticatedOpera: false,
                    authenticatedAdmin: false,
                    customer: "",
                    user: "",
                    remember: false,
                    pointName: "",
                    pointId: "",
                    avatar: "",
                    closeSession: false,
                    closeWindow: false, // (fix de 'closeWIndow')
                };
            }
            const parsed = JSON.parse(raw);
            // normalización mínima por si faltan claves
            return {
                authenticatedOpera: false,
                authenticatedAdmin: false,
                customer: "",
                user: "",
                remember: false,
                pointName: "",
                pointId: "",
                avatar: "",
                closeSession: false,
                closeWindow: false,
                ...parsed,
            };
        } catch {
            // si el JSON está corrupto, reseteamos
            return {
                authenticatedOpera: false,
                authenticatedAdmin: false,
                customer: "",
                user: "",
                remember: false,
                pointName: "",
                pointId: "",
                avatar: "",
                closeSession: false,
                closeWindow: false,
            };
        }
    });

    return (
        <UserContext.Provider value={{ userInit, setUserInit }}>
            {children}
        </UserContext.Provider>
    );
};
