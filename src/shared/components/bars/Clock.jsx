import { Typography, Box, useTheme } from '@mui/material';
import { useState, useEffect } from 'react';

export const Clock = () => {
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

    const theme = useTheme();

    return (
        <Box textAlign="center">
            <Typography
                variant="h5"
                sx={{
                    fontWeight: 'bold',
                    fontSize: { xs: '1.1rem', sm: '1.4rem', md: '1.6rem' },
                    lineHeight: 1.1,
                }}
            >
                {formatoHora}
            </Typography>
            <Typography
                variant="h6"
                sx={{
                    fontSize: { xs: '0.8rem', sm: '1rem', md: '1.1rem' },
                    color: theme.palette.text.contrastText,
                }}
            >
                {formatoFecha}
            </Typography>
        </Box>
    );
}