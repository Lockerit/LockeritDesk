// src/shared/components/icons/MoneyLoading.jsx
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { keyframes } from '@mui/system';

const rotate = keyframes`
  0%   { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const MoneyLoading = () => {
    const theme = useTheme();
    const color = theme.palette.primary.main || '#009640';

    // tamaños responsivos sin usar scale
    const iconSize = {
        xs: 60,
        sm: 80,
        md: 120,
    };
    const arrowSize = {
        xs: 8,
        sm: 12,
        md: 16,
    };
    const strokeWidth = 4; // px
    const offset = 4;      // px

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <Box
                sx={{
                    position: 'relative',
                    width: {
                        xs: iconSize.xs,
                        sm: iconSize.sm,
                        md: iconSize.md,
                    },
                    height: {
                        xs: iconSize.xs,
                        sm: iconSize.sm,
                        md: iconSize.md,
                    },
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {/* Símbolo dólar */}
                <Typography
                    component="span"
                    sx={{
                        fontSize: {
                            xs: theme.spacing(7),
                            sm: theme.spacing(8),
                            md: theme.spacing(9),
                        },
                        fontWeight: 800,
                        color,
                    }}
                >
                    $
                </Typography>

                {/* Contenedor que rota */}
                <Box
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        animation: `${rotate} 2s linear infinite`,
                    }}
                >
                    {/* Flecha superior derecha */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: offset,
                            right: offset,
                            width: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            height: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            borderTop: `${strokeWidth}px solid ${color}`,
                            borderRight: `${strokeWidth}px solid ${color}`,
                            borderRadius: 1,
                            transform: 'translate(50%, -50%) rotate(90deg)',
                            boxSizing: 'border-box',
                        }}
                    />

                    {/* Flecha superior izquierda */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: offset,
                            left: offset,
                            width: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            height: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            borderTop: `${strokeWidth}px solid ${color}`,
                            borderLeft: `${strokeWidth}px solid ${color}`,
                            borderRadius: 1,
                            transform: 'translate(-50%, -50%) rotate(90deg)',
                            boxSizing: 'border-box',
                        }}
                    />

                    {/* Flecha inferior izquierda */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: offset,
                            left: offset,
                            width: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            height: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            borderBottom: `${strokeWidth}px solid ${color}`,
                            borderLeft: `${strokeWidth}px solid ${color}`,
                            borderRadius: 1,
                            transform: 'translate(-50%, 50%) rotate(90deg)',
                            boxSizing: 'border-box',
                        }}
                    />

                    {/* Flecha inferior derecha */}
                    <Box
                        sx={{
                            position: 'absolute',
                            bottom: offset,
                            right: offset,
                            width: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            height: {
                                xs: arrowSize.xs,
                                sm: arrowSize.sm,
                                md: arrowSize.md,
                            },
                            borderBottom: `${strokeWidth}px solid ${color}`,
                            borderRight: `${strokeWidth}px solid ${color}`,
                            borderRadius: 1,
                            transform: 'translate(50%, 50%) rotate(90deg)',
                            boxSizing: 'border-box',
                        }}
                    />
                </Box>
            </Box>
        </Box>
    );
};
