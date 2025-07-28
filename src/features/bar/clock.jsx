import React, { useState, useEffect } from 'react';
import { Typography, Box } from '@mui/material';

const fileName = 'clcok';

export default function Clock() {
    const [horaActual, setHoraActual] = useState(new Date());

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
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {formatoHora}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 14 }}>
                {formatoFecha}
            </Typography>
        </Box>
    ); F
}