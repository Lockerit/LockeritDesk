import { useRef, useState, useEffect } from "react";
import { Box, Paper, TextField, Fade } from "@mui/material";
import VirtualKeyboard from "../utils/virtualKeyboard";
import { useClickOutside } from "../hooks/useClickOutside";

export default function LoginField({
    label,
    value,
    setValue,
    error,
    helperText,
    type = "text",
    InputProps
}) {
    const inputRef = useRef();
    const keyboardContainerRef = useRef();
    const [showKeyboard, setShowKeyboard] = useState(false);

    useClickOutside([inputRef, keyboardContainerRef], () => setShowKeyboard(false));

    // Ancho fijo 90% de la ventana
    const [keyboardWidth, setKeyboardWidth] = useState(window.innerWidth * 0.9);
    useEffect(() => {
        const handleResize = () => setKeyboardWidth(window.innerWidth * 0.9);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return (
        <Box sx={{ position: "relative", width: "100%", mb: 2 }}>
            <TextField
                inputRef={inputRef}
                variant="standard"
                fullWidth
                label={label}
                type={type}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onFocus={() => setShowKeyboard(true)}
                error={error}
                helperText={helperText}
                InputProps={InputProps}
            />

            <Fade in={showKeyboard}>
                <Paper
                    elevation={3}
                    ref={keyboardContainerRef}
                    sx={{
                        position: "fixed",      // 🔹 clave: usar fixed
                        bottom: 20,             // opcional: distancia desde el bottom de la pantalla
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        p: 1,
                        width: keyboardWidth,   // 🔹 90% de la pantalla
                        maxWidth: "90%",
                    }}
                >
                    <VirtualKeyboard inputValue={value} onChange={setValue} />
                </Paper>
            </Fade>
        </Box>
    );
}
