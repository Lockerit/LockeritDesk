import { createContext, useContext } from "react";

export const KeyboardContext = createContext({
    openKeyboard: () => { },
    closeKeyboard: () => { },
});

export const useKeyboard = () => useContext(KeyboardContext);
