import { TextField } from "@mui/material";
import { useRef } from "react";
import { useKeyboard } from "@shared/context/KeyboardContext.jsx";

export const TextFieldVirtKeyPad = ({ value, setValue, ...props }) => {
    const { openKeyboard } = useKeyboard();
    const inputRef = useRef();

    return (
        <TextField
            {...props}
            inputRef={inputRef}
            value={value}
            onClick={(e) => openKeyboard(e.currentTarget, setValue, value, inputRef)}
            onChange={(e) => setValue(e.target.value)}
        />
    );
}
