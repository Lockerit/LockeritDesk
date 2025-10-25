
import { Close } from '@mui/icons-material';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Typography, Button, Box, Slide, Paper, IconButton
} from '@mui/material';
import { useState, forwardRef, useEffect } from 'react';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { formatTime } from '@shared/utils/utils.js';


const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const ShowLocker = ({ open, onConfirm, locker, title, msg, timeout = 15, backColor = 'gray', operation }) => {

    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    const [secondsLeft, setSecondsLeft] = useState(timeout);

    // 1) Reinicia el contador cada vez que se abre el modal o cambia el timeout
    useEffect(() => {
        if (!open) return;
        setSecondsLeft(timeout);
    }, [open, timeout]);

    // 2) Tiqueo del contador (1s) mientras esté abierto y queden segundos
    useEffect(() => {
        if (!open || secondsLeft <= 0) return;
        const id = setInterval(() => setSecondsLeft((prev) => prev - 1), 1000);
        return () => clearInterval(id);
    }, [open, secondsLeft]);

    // 3) Autocierre al llegar a 0 (incluye timeout en deps porque se usa en setSecondsLeft)
    useEffect(() => {
        if (!open || secondsLeft !== 0) return;
        setSecondsLeft(timeout);
        onConfirm();
    }, [open, secondsLeft, onConfirm, timeout]);
    return (
        <Dialog
            open={open}
            onClose={() => { }}
            keepMounted={false}
            hideBackdrop               // 👈 evita bloquear clics en el fondo
            disableEscapeKeyDown
            disableEnforceFocus        // 👈 no fuerza el foco al modal
            disableAutoFocus
            disableRestoreFocus
            sx={{
                pointerEvents: "auto",   // 👈 asegura que botones sean clickeables
                zIndex: 1500,            // encima del keypad
            }}
            PaperProps={{
                sx: {
                    width: scaledDimension(
                        {
                            xs: { base: 60, min: 55, max: 65 },
                            sm: { base: 60, min: 55, max: 65 },
                            md: { base: 50, min: 45, max: 55 },
                            lg: { base: 40, min: 35, max: 45 },
                        },
                        scale
                    ),
                    height: scaledDimension(
                        {
                            xs: { base: 60, min: 55, max: 65 },
                            sm: { base: 60, min: 55, max: 65 },
                            md: { base: 80, min: 75, max: 85 },
                            lg: { base: 80, min: 75, max: 85 },
                        },
                        scale
                    ),
                    // minHeight: '60%',
                    // maxHeight: '80%',
                    // height: '60%',
                    overflow: "hidden",   // ✅ scroll si se pasa
                    borderRadius: `${Math.max(8, 16 * scale)}px`,
                    display: "flex",
                    flexDirection: "column",
                    p: 3 * scale,
                },
            }}
            slots={{ transition: Transition }}
        >
            {/* Encabezado */}
            <Box
                sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: 1 * scale,
                    position: "absolute",
                    right: 3 * scale,
                    top: 3 * scale,
                }}
            >
                <Typography variant="body2">
                    {formatTime(secondsLeft)}
                </Typography>
                <IconButton onClick={onConfirm}>
                    <Close />
                </IconButton>
            </Box>

            <DialogTitle sx={{ textAlign: "center" }}>
                Apertura de casillero
            </DialogTitle>

            {/* Contenido */}
            <DialogContent
                sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    alignItems: "center",
                    alignContent: "center",
                    overflow: "hidden",
                    p: 0,
                }}
            >
                <Typography variant="h3" sx={{ textAlign: "center", mt: 2 * scale, fontWeight: "bold" }}>
                    {title}
                </Typography>

                <Paper
                    elevation={24}
                    sx={{
                        width: "40%",
                        height: "40%",   // fuerza 40% del alto disponible
                        display: "flex", // para que los children puedan centrarse
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: backColor || "primary.main",
                        color: "error.contrastText",
                    }}
                >
                    <Typography variant="h1" sx={{ textAlign: "center", fontWeight: "bold" }}>
                        {locker}
                    </Typography>
                </Paper>

                <Typography variant="h4" sx={{ textAlign: "center", py: 2 * scale }}>
                    {msg}
                </Typography>

                {(operation === "Retirar" || operation === "Guardar" || operation === "Reservado") && (
                    <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold", py: 2 * scale }}>
                        ¡No olvides cerrar el casillero!
                    </Typography>
                )}
                {operation === "Retirar" && (
                    <Typography variant="h5" sx={{ textAlign: "center" }}>
                        Disponible para una nueva asignación.
                    </Typography>
                )}
            </DialogContent>

            {/* Acciones */}
            <DialogActions
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                }}
            >
                <Button
                    onClick={onConfirm}
                    color="primary"
                    variant="contained"
                    fullWidth
                    sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}
                >
                    Aceptar
                </Button>
            </DialogActions>
        </Dialog>

    );
}