import React, { useEffect, useRef, useState } from "react";
import Keyboard from "react-simple-keyboard";
import "react-simple-keyboard/build/css/index.css";

export const VirtualKeyboard = ({ inputValue, onChange, onEnter, activeField }) => {
    const keyboardRef = useRef(null);
    const [layoutName, setLayoutName] = useState("default"); // 🔹 estado para shift/lock

    useEffect(() => {
        if (keyboardRef.current) keyboardRef.current.setInput(inputValue);
    }, [inputValue]);

    const onKeyPress = (button) => {
        if (button === "{shift}" || button === "{lock}") {
            const newLayout = layoutName === "default" ? "shift" : "default";
            setLayoutName(newLayout);
            keyboardRef.current.setOptions({ layoutName: newLayout });
        }

        if (button === "{enter}") {
            const form = activeField?.inputRef?.current?.closest("form");

            if (form) {
                // Cierra el teclado primero
                if (typeof onEnter === "function") onEnter();

                // Dispara el submit nativo
                form.requestSubmit();
            }
        }
    };

    return (
        <Keyboard
            keyboardRef={(r) => (keyboardRef.current = r)}
            layoutName={layoutName}
            layout={{
                default: [
                    "` 1 2 3 4 5 6 7 8 9 0 - = {bksp}",
                    "{tab} q w e r t y u i o p [ ] \\",
                    "{lock} a s d f g h j k l ñ ; ' {enter}",
                    "{shift} z x c v b n m , . / {shift}",
                    ".com @ {space}"
                ],
                shift: [
                    "~ ! @ # $ % ^ & * ( ) _ + {bksp}",
                    "{tab} Q W E R T Y U I O P { } |",
                    "{lock} A S D F G H J K L Ñ : \" {enter}",
                    "{shift} Z X C V B N M < > ? {shift}",
                    ".com @ {space}"
                ]
            }}
            onChange={onChange}
            onKeyPress={onKeyPress}
            input={inputValue}
        />
    );
}
