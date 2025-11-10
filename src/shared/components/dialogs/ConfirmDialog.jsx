import { MobileFriendly } from '@mui/icons-material';
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

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export const ConfirmDialog = ({
    open,
    onConfirm,
    onCancel,
    title,
    tittle,          // compatibilidad con el typo usado en otros sitios
    mesg,
    items,
    phone,
    isPhone,
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
                        xs: '60%',
                        sm: '60%',
                        md: '40%',
                        lg: '30%',
                    },
                    maxWidth: 'none',
                    height: 'auto',
                    borderRadius: theme.spacing(3),
                    p: theme.spacing(3),
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
                                borderBottom: '1px solid #eee',
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
                    // Modo legacy con mesg como string
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
                        <Typography
                            variant="h4"
                            align="center"
                            sx={{ whiteSpace: 'pre-line' }}
                        >
                            {mesg}
                        </Typography>
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
                    pb: theme.spacing(2),
                }}
            >
                <Button
                    onClick={onCancel}
                    color="secondary"
                    variant="contained"
                    fullWidth
                >
                    No
                </Button>
                <Button
                    onClick={onConfirm}
                    autoFocus
                    color="primary"
                    variant="contained"
                    fullWidth
                >
                    Sí
                </Button>
            </DialogActions>
        </Dialog>
    );
};
