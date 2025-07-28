import React, { createContext, useState, useContext } from 'react';

export const UserContext = createContext();

const fileName = 'userContext';

export const UserProvider = ({ children }) => {
    const [userInit, setUserInit] = useState(() => {

        const init = localStorage.getItem('userInit');
        if (init == null || init == undefined) {
            return {
                authenticated: false,
                user: '',
                remember: false,
                locationDevice: '',
                avatar: '',
                closeSession: false,
                closeWIndow: false
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
