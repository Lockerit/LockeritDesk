import { forwardRef } from 'react';
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
import { scaledWidth } from '../utils/scaledWidth';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Typography,
    Button,
    Box,
    Slide
} from '@mui/material';
import {
    MobileFriendly,
} from '@mui/icons-material';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'confirmDialog';

export default function ConfirmDialog({ open, onConfirm, onCancel, title, mesg, phone, isPhone }) {

    const { width, height, factor } = useWindowSize();
    const scale = factor || 1;

    return (
        <Dialog open={open} onClose={(event, reason) => {
            if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                onCancel(); // tu función personalizada para cerrar
            }

        }}
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    width: scaledWidth(
                        {
                            xs: { base: 60, min: 55, max: 55 }, // en % para mobile
                            sm: { base: 50, min: 45, max: 55 }, // tablet
                            md: { base: 40, min: 35, max: 45 }, // desktop medio
                            lg: { base: 30, min: 25, max: 35 }, // desktop grande
                        },
                        scale
                    ),
                    height: 'auto',
                    // maxWidth: `${Math.max(70, Math.min(95, 90 * scale))}vw`, // rango de 70%-95% según escala
                    borderRadius: `${Math.max(8, 16 * scale)}px`, // esquinas suaves que escalan
                    p: 2 * scale // padding proporcional
                }
            }}
            slots={{
                transition: Transition,
            }}
        >
            <DialogTitle>
                {title}
            </DialogTitle>

            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',   // centra horizontalmente
                    justifyContent: 'center', // centra verticalmente
                    textAlign: 'center',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', textAlign: 'center', gap: 2, mt: 1 * scale }}>
                    {isPhone && (<MobileFriendly color="primary" sx={{ fontSize: 40 * scale }} />)}
                    <Typography variant="h4" sx={{ whiteSpace: 'pre-line' }}>
                        {mesg}
                    </Typography>
                </Box>
                {isPhone && (<Typography variant="h4" sx={{ textAlign: 'center', mt: 2 * scale, fontWeight: 'bold' }}>
                    {phone}
                </Typography>)}
            </DialogContent>

            <DialogActions
                sx={{
                    display: 'flex',
                    height: '100%', // puedes ajustar esto según lo que necesites
                    width: '100%',
                }}>
                <Button onClick={onCancel} color="secondary" variant="contained" fullWidth sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}>
                    No
                </Button>
                <Button onClick={onConfirm} color="primary" variant="contained" fullWidth sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}>
                    Si
                </Button>
            </DialogActions>
        </Dialog>
    );
}
