import React, { useState, useEffect } from 'react';
import { Typography, Box } from '@mui/material';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';

const fileName = 'Clock';

export const Clock = () => {
    const [horaActual, setHoraActual] = useState(new Date());
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    useEffect(() => {
        const intervalo = setInterval(() => {
            setHoraActual(new Date());
        }, 1000); // actualiza cada segundo

        return () => clearInterval(intervalo); // limpia al desmontar
    }, []);

    const formatoHora = horaActual.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });

    const formatoFecha = horaActual.toLocaleDateString('es-CO', {
        weekday: 'long', // lunes, martes...
        day: '2-digit',
        month: 'long',   // enero, febrero...
        year: 'numeric',
    });

    return (
        <Box textAlign="center">
            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                {formatoHora}
            </Typography>
            <Typography variant="h6">
                {formatoFecha}
            </Typography>
        </Box>
    );
}