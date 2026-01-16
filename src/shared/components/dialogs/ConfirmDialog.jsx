import { Cancel, CheckCircle, MobileFriendly } from '@mui/icons-material';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Box,
    Slide,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { forwardRef } from 'react';

import { dialogCtaButtonSx } from '@shared/theme/buttonSx.js';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const ConfirmDialog = ({
    open,
    onConfirm,
    onCancel,
    title,
    tittle,          // compatibilidad con el typo usado en otros sitios
    msg,
    items,
    phone,
    isPhone,
    isCloseDoor = false,
}) => {
    const theme = useTheme();
    const dialogTitle = title || tittle || 'Confirmar';

    return (
        <Dialog
            open={open}
            onClose={() => { }}
            keepMounted={false}
            hideBackdrop
            disableEscapeKeyDown
            sx={{
                pointerEvents: 'auto',
                zIndex: 1500,
            }}
            PaperProps={{
                sx: {
                    width: {
                        xs: '85%',
                        sm: '75%',
                        md: '50%',
                        lg: '40%',
                    },
                    maxWidth: 'none',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    height: 'auto',
                },
            }}
            slots={{ transition: Transition }}
        >
            <DialogTitle>{dialogTitle}</DialogTitle>

            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: theme.spacing(2),
                    textAlign: 'left',
                    width: '100%',
                }}
            >
                {/* Modo con items */}
                {Array.isArray(items) && items.length > 0 ? (
                    items.map((item, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                                pb: 1,
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {item.label}:
                            </Typography>
                            <Typography variant="h6">{item.value}</Typography>
                        </Box>
                    ))
                ) : (
                    // Modo legacy con msg como string
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            textAlign: 'center',
                            gap: theme.spacing(1.5),
                            mt: theme.spacing(1),
                        }}
                    >
                        {isPhone && (
                            <MobileFriendly
                                color="primary"
                                sx={{ fontSize: theme.spacing(5) }}
                            />
                        )}

                        {Array.isArray(msg) ? (
                            msg.map((line, idx) => {
                                // Permite usar directamente strings dentro del array si quieres
                                if (typeof line === 'string') {
                                    return (
                                        <Typography
                                            key={idx}
                                            variant="h4"
                                            align="center"
                                        >
                                            {line}
                                        </Typography>
                                    );
                                }

                                const {
                                    text,
                                    variant = 'h4',
                                    align = 'center',
                                    sx = {},
                                    ...rest
                                } = line;

                                return (
                                    <Typography
                                        key={idx}
                                        variant={variant}
                                        align={align}
                                        sx={sx}
                                        {...rest}
                                    >
                                        {text}
                                    </Typography>
                                );
                            })
                        ) : (
                            <Typography
                                variant="h4"
                                align="center"
                                sx={{ whiteSpace: 'pre-line' }}
                            >
                                {msg}
                            </Typography>
                        )}
                    </Box>
                )}

                {isPhone && (
                    <Typography
                        variant="h1"
                        sx={{
                            textAlign: 'center',
                            mt: theme.spacing(2),
                            fontWeight: 'bold',
                        }}
                    >
                        {phone}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    display: 'flex',
                    width: '100%',
                    gap: theme.spacing(2),
                    px: theme.spacing(3),
                    pb: isCloseDoor ? 0 : theme.spacing(2),
                    flexDirection: 'row',
                }}
            >
                <Button
                    onClick={onCancel}
                    color="secondary"
                    variant="contained"
                    fullWidth
                    endIcon={<Cancel />}
                    sx={dialogCtaButtonSx(theme)}
                >
                    No
                </Button>
                <Button
                    onClick={onConfirm}
                    autoFocus
                    color="primary"
                    variant="contained"
                    fullWidth
                    endIcon={<CheckCircle />}
                    sx={dialogCtaButtonSx(theme)}
                >
                    Sí
                </Button>
            </DialogActions>

            {/* Mensaje debajo de los botones */}
            {isCloseDoor && (
                <Box
                    sx={{
                        width: '100%',
                        textAlign: 'center',
                        mt: theme.spacing(1),
                        pb: theme.spacing(2),
                    }}
                >
                    <Typography
                        variant="h5"
                        sx={{
                            fontWeight: 'bold',
                            color: 'error.main',
                        }}
                    >
                        Por favor cerrar el casillero.
                    </Typography>
                </Box>
            )}
        </Dialog>
    );
};
