import { TextField } from '@mui/material';
import { useRef } from 'react';


import { useKeyboard } from '@shared/context/KeyboardContext.jsx';

export const TextFieldVirtKeyPad = ({ value, setValue, ...props }) => {
    const { openKeyboard } = useKeyboard();
    const inputRef = useRef();

    const open = (target) => openKeyboard(target, setValue, value, inputRef);

    return (
        <TextField
            {...props}
            inputRef={inputRef}
            value={value}
            fullWidth={props.fullWidth ?? true}
            onPointerDown={(e) => open(e.currentTarget)}
            onClick={(e) => open(e.currentTarget)}
            onChange={(e) => setValue(e.target.value)}
            sx={{
                cursor: 'text',
                WebkitTapHighlightColor: 'transparent',
                ...(props.sx || {}),
            }}
        />
    );
}
