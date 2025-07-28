import { forwardRef } from 'react';
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
    return (
        <Dialog open={open} onClose={(event, reason) => {
            if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                onCancel(); // tu función personalizada para cerrar
            }

        }}
            disableEscapeKeyDown
            PaperProps={{
                sx: {
                    width: '40vw',
                    height: 'auto',
                    maxWidth: '90vw',
                    borderRadius: 4,
                    p: 2
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
                <Box sx={{ display: 'flex', alignItems: 'center', textAlign: 'center', gap: 2, mt: 1 }}>
                    {isPhone && (<MobileFriendly color="primary" sx={{ fontSize: 40 }} />)}
                    <Typography variant="h4" sx={{ whiteSpace: 'pre-line' }}>
                        {mesg}
                    </Typography>
                </Box>
                {isPhone && (<Typography variant="h4" sx={{ textAlign: 'center', mt: 2, fontWeight: 'bold' }}>
                    {phone}
                </Typography>)}
            </DialogContent>

            <DialogActions
                sx={{
                    display: 'flex',
                    height: '100%', // puedes ajustar esto según lo que necesites
                    width: '100%',
                }}>
                <Button onClick={onCancel} color="secondary" variant="contained" fullWidth sx={{ mr: 3, ml: 3, p: 3 }}>
                    No
                </Button>
                <Button onClick={onConfirm} color="primary" variant="contained" fullWidth sx={{ mr: 3, ml: 3, p: 3 }}>
                    Si
                </Button>
            </DialogActions>
        </Dialog>
    );
}
