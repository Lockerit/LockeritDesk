import {
    Box,
    Chip,
    ClickAwayListener,
    Divider,
    Paper,
    Popper,
    Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useMemo } from 'react';

export const StatusLockersPopper = ({
    open,
    anchorEl,
    onClose,
    title,
    statusSelected,
    lockers = [],       // [{ lockerCode, status, module? }]
    statusColors = [],  // [{ status, color }]
    onlyStatus,
}) => {
    const theme = useTheme();
    const targetStatus = (onlyStatus ?? statusSelected ?? '').toString().toLowerCase();

    const colorByStatus = (status) => {
        const found = statusColors.find(
            (s) => String(s.status).toLowerCase() === String(status).toLowerCase()
        );
        return found?.color;
    };

    const filteredCodes = useMemo(() => {
        if (!targetStatus) return [];
        return lockers
            .filter((l) => String(l.status).toLowerCase() === targetStatus)
            .map((l) => l.lockerCode)
            .filter(Boolean)
            .sort((a, b) => String(a).localeCompare(String(b)));
    }, [lockers, targetStatus]);

    const chipBg = colorByStatus(targetStatus) || theme.palette.text.secondary;
    const paperBg = theme.palette.background.paper;

    return (
        <Popper
            open={open}
            anchorEl={anchorEl}
            placement="bottom-start"
            sx={{ zIndex: theme.zIndex.modal + 1 }}
            modifiers={[
                { name: 'offset', options: { offset: [0, 8] } },
                { name: 'preventOverflow', options: { padding: 8 } },
            ]}
        >
            <ClickAwayListener onClickAway={onClose}>
                <Paper
                    elevation={6}
                    sx={{
                        backgroundColor: paperBg,
                        p: theme.spacing(2),
                        borderRadius: 2,
                        minWidth: { xs: 280, sm: 360 },
                        maxWidth: { xs: 360, sm: 560 },
                    }}
                >
                    <Typography
                        variant="h6"
                        sx={{ fontWeight: 700, color: theme.palette.text.primary }}
                    >
                        {title ||
                            (statusSelected ? `Casilleros en estado: ${statusSelected}` : 'Casilleros')}
                    </Typography>

                    <Divider sx={{ my: theme.spacing(1) }} />

                    <Box
                        sx={{
                            maxHeight: { xs: 220, sm: 280 },
                            overflowY: 'auto',
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'repeat(2, 1fr)',
                                sm: 'repeat(3, 1fr)',
                                md: 'repeat(5, 1fr)',
                            },
                            gap: theme.spacing(1),
                            pr: theme.spacing(0.5),
                        }}
                    >
                        {filteredCodes.length === 0 ? (
                            <Typography
                                variant="body2"
                                sx={{
                                    gridColumn: '1 / -1',
                                    color: theme.palette.text.secondary,
                                }}
                            >
                                No hay casilleros en este estado.
                            </Typography>
                        ) : (
                            filteredCodes.map((code) => (
                                <Chip
                                    key={code}
                                    label={code}
                                    sx={{
                                        height: { xs: 36, sm: 40 },
                                        borderRadius: 2,
                                        fontSize: { xs: theme.typography.body2.fontSize, sm: theme.typography.body1.fontSize },
                                        fontWeight: 700,
                                        backgroundColor: chipBg,
                                        color: theme.palette.primary.contrastText,
                                        justifySelf: 'stretch',
                                    }}
                                />
                            ))
                        )}
                    </Box>

                </Paper>
            </ClickAwayListener>
        </Popper>
    );
};
