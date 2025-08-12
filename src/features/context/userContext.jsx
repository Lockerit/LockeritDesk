import React, { createContext, useState, useContext } from 'react';

export const UserContext = createContext();

const USER_STORAGE_KEY = 'userInit';
const fileName = 'userContext';

export const UserProvider = ({ children }) => {
    const [userInit, setUserInit] = useState(() => {

        const init = localStorage.getItem(USER_STORAGE_KEY);
        if (init == null || init == undefined) {
            return {
                authenticated: false,
                client: '',
                user: '',
                remember: false,
                locationDevice: '',
                pointDevice: '',
                avatar: '',
                closeSession: false,
                closeWIndow: false,
                adminWindow: false,
                adminWindowInto: false
            };
        }

        return JSON.parse(init);
    });

    return (
        <UserContext.Provider value={{ userInit, setUserInit }}>
            {children}
        </UserContext.Provider>
    );
};

// Custom hook (opcional, pero útil)
export const useUser = () => useContext(UserContext);
