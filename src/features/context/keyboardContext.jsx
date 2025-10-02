// KeyboardProvider.jsx
import { useState, createContext, useContext } from "react";
import { Popover } from "@mui/material";
import VirtualKeyboard from "../utils/virtualKeyboard";

const KeyboardContext = createContext();

export function KeyboardProvider({ children }) {
    const [anchorEl, setAnchorEl] = useState(null);
    const [activeField, setActiveField] = useState(null);
    const [anchorOrigin, setAnchorOrigin] = useState({
        vertical: "bottom",
        horizontal: "center"
    });
    const [transformOrigin, setTransformOrigin] = useState({
        vertical: "top",
        horizontal: "center"
    });

    const openKeyboard = (anchorNode, fieldSetter, value, inputRef) => {
        if (anchorNode) {
            const rect = anchorNode.getBoundingClientRect();
            const windowHeight = window.innerHeight;

            // 👉 si el input está en la mitad inferior de la pantalla, abre el teclado ARRIBA
            if (rect.top > windowHeight / 2) {
                setAnchorOrigin({ vertical: "top", horizontal: "center" });
                setTransformOrigin({ vertical: "bottom", horizontal: "center" });
            } else {
                // 👉 si está en la parte superior, abre ABAJO (normal)
                setAnchorOrigin({ vertical: "bottom", horizontal: "center" });
                setTransformOrigin({ vertical: "top", horizontal: "center" });
            }
        }

        setAnchorEl(anchorNode);
        setActiveField({ setValue: fieldSetter, value, inputRef });
    };

    const closeKeyboard = () => {
        setAnchorEl(null);
        setActiveField(null);
    };

    return (
        <KeyboardContext.Provider value={{ openKeyboard, closeKeyboard }}>
            {children}

            {/* Teclado global */}
            <Popover
                open={Boolean(anchorEl && document.body.contains(anchorEl))}
                anchorEl={anchorEl}
                onClose={closeKeyboard}
                anchorOrigin={anchorOrigin}
                transformOrigin={transformOrigin}
                PaperProps={{ sx: { width: "90vw", maxWidth: "90vw", p: 1 } }}
            >
                {activeField && (
                    <VirtualKeyboard
                        inputValue={activeField.value}
                        onChange={(val) => activeField.setValue(val)}
                        onEnter={closeKeyboard}
                        activeField={activeField}
                    />
                )}
            </Popover>
        </KeyboardContext.Provider>
    );
}

export const useKeyboard = () => useContext(KeyboardContext);
