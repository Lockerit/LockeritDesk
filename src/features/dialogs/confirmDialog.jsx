import { forwardRef } from 'react';
import { useWindowSizeContext } from '../context/windowSizeContext';
import { scaledDimension } from '../utils/scaledDimension.js';
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
import { MobileFriendly } from '@mui/icons-material';

const Transition = forwardRef(function Transition(props, ref) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export default function ConfirmDialog({
    open,
    onConfirm,
    onCancel,
    title,
    mesg,
    items,
    phone,
    isPhone
}) {
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    return (
        <Dialog
            open={open}
            onClose={() => { }}
            keepMounted={false}
            hideBackdrop
            disableEscapeKeyDown
            disableEnforceFocus
            disableAutoFocus
            disableRestoreFocus
            sx={{
                pointerEvents: "auto",
                zIndex: 1500,
            }}
            PaperProps={{
                sx: {
                    width: scaledDimension(
                        {
                            xs: { base: 60, min: 55, max: 60 },
                            sm: { base: 60, min: 55, max: 60 },
                            md: { base: 40, min: 35, max: 40 },
                            lg: { base: 30, min: 25, max: 35 },
                        },
                        scale
                    ),
                    height: 'auto',
                    borderRadius: `${Math.max(8, 16 * scale)}px`,
                    p: 2 * scale,
                }
            }}
            slots={{ transition: Transition }}
        >
            <DialogTitle>{title}</DialogTitle>

            <DialogContent
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2 * scale,
                    textAlign: "left",
                    width: "100%",
                }}
            >
                {/* ✅ Nuevo modo con items */}
                {Array.isArray(items) && items.length > 0 ? (
                    items.map((item, idx) => (
                        <Box
                            key={idx}
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                borderBottom: "1px solid #eee",
                                pb: 1,
                            }}
                        >
                            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                                {item.label}:
                            </Typography>
                            <Typography variant="h6">{item.value}</Typography>
                        </Box>
                    ))
                ) : (
                    /* ✅ Modo legacy con mesg como string */
                    <Box sx={{ display: "flex", alignItems: "center", textAlign: "center", gap: 2 * scale, mt: 1 * scale }}>
                        {isPhone && (<MobileFriendly color="primary" sx={{ fontSize: 40 * scale }} />)}
                        <Typography variant="h4" sx={{ whiteSpace: 'pre-line' }}>
                            {mesg}
                        </Typography>
                    </Box>
                )}

                {isPhone && (
                    <Typography
                        variant="h2"
                        sx={{ textAlign: "center", mt: 2 * scale, fontWeight: "bold" }}
                    >
                        {phone}
                    </Typography>
                )}
            </DialogContent>

            <DialogActions
                sx={{
                    display: "flex",
                    width: "100%",
                }}
            >
                <Button
                    onClick={onCancel}
                    color="secondary"
                    variant="contained"
                    fullWidth
                    sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}
                >
                    No
                </Button>
                <Button
                    onClick={onConfirm}
                    color="primary"
                    variant="contained"
                    fullWidth
                    sx={{ mr: 3 * scale, ml: 3 * scale, p: 3 * scale }}
                >
                    Si
                </Button>
            </DialogActions>
        </Dialog>
    );
}
