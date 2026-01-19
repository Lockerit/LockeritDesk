// src/shared/components/icons/MoneyLoading.jsx
import { Box } from '@mui/material';
import { CurrencyExchange } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';

const exchangeSlideFade = keyframes`
    0%   { transform: translateX(60%) scale(0.95) rotate(0deg); opacity: 0; }
    25%  { opacity: 1; }
    60%  { transform: translateX(-60%) scale(1) rotate(180deg); opacity: 0.9; }
    100% { transform: translateX(-60%) scale(1) rotate(360deg); opacity: 0; }
`;

export const MoneyLoading = ({
    color,
    speedMs = 1800,   // velocidad de animación
    sizeBase = 150,    // tamaño base (px)
}) => {
    const theme = useTheme();
    const ringColor = color || theme.palette.primary.main;

    // Tamaños responsivos basados en sizeBase
    const iconSize = {
        xs: sizeBase * 0.8,
        sm: sizeBase,
        md: sizeBase * 1.1,
    };
    const iconPx = {
        xs: Math.round(sizeBase * 0.7),
        sm: Math.round(sizeBase * 0.8),
        md: Math.round(sizeBase * 0.9),
    };

    return (
        <Box
            sx={{
                position: 'relative',
                width: { xs: iconSize.xs, sm: iconSize.sm, md: iconSize.md },
                height: { xs: iconSize.xs, sm: iconSize.sm, md: iconSize.md },
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {/* Icono CurrencyExchange animado */}
            <CurrencyExchange
                sx={{
                    fontSize: {
                        xs: iconPx.xs,
                        sm: iconPx.sm,
                        md: iconPx.md,
                    },
                    color: ringColor,
                    filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.25))',
                    animation: `${exchangeSlideFade} ${Math.max(1200, speedMs)}ms ease-in-out infinite`,
                }}
            />
        </Box>
    );
};
