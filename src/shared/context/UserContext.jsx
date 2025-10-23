import { createContext, useState, useContext } from 'react';

export const UserContext = createContext();

const USER_STORAGE_KEY = 'userInit';

export const UserProvider = ({ children }) => {
    const [userInit, setUserInit] = useState(() => {

        const init = localStorage.getItem(USER_STORAGE_KEY);
        if (init == null || init == undefined) {
            return {
                authenticatedOpera: false,
                authenticatedAdmin: false,
                customer: '',
                user: '',
                remember: false,
                fullScreen: true,
                pointName: '',
                pointId: '',
                avatar: '',
                closeSession: false,
                closeWIndow: false,
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
