// src/shared/components/icons/MoneyLoading.jsx
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';

const rotateDollar = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const dash = keyframes`
  0%   { stroke-dasharray: 1px, 200px;  stroke-dashoffset: 0; }
  50%  { stroke-dasharray: 120px, 200px; stroke-dashoffset: -60px; }
  100% { stroke-dasharray: 120px, 200px; stroke-dashoffset: -180px; }
`;

export const MoneyLoading = ({
    color,
    speedMs = 1400,   // velocidad de animación
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
    const dollarFont = {
        xs: Math.round(sizeBase * 0.43),
        sm: Math.round(sizeBase * 0.45),
        md: Math.round(sizeBase * 0.5),
    };
    const strokeWidth = {
        xs: Math.max(4, Math.round(sizeBase * 0.035)),
        sm: Math.max(5, Math.round(sizeBase * 0.04)),
        md: Math.max(6, Math.round(sizeBase * 0.045)),
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
            {/* Símbolo $ girando */}
            <Typography
                component="span"
                sx={{
                    fontSize: {
                        xs: dollarFont.xs,
                        sm: dollarFont.sm,
                        md: dollarFont.md,
                    },
                    fontWeight: 800,
                    color: ringColor,
                    animation: `${rotateDollar} ${speedMs}ms linear infinite`,
                    transformOrigin: '50% 50%',
                }}
            >
                $
            </Typography>

            {/* Anillo tipo progress infinito */}
            <Box
                component="svg"
                viewBox="0 0 100 100"
                sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            >
                <Box
                    component="circle"
                    cx={50}
                    cy={50}
                    r={35}
                    sx={{
                        fill: 'none',
                        stroke: ringColor,
                        opacity: 0.95,
                        strokeWidth: {
                            xs: strokeWidth.xs,
                            sm: strokeWidth.sm,
                            md: strokeWidth.md,
                        },
                        strokeLinecap: 'round',
                        strokeDasharray: '1px, 200px',
                        strokeDashoffset: 0,
                        animation: `${dash} ${speedMs}ms ease-in-out infinite`,
                    }}
                />
            </Box>
        </Box>
    );
};
