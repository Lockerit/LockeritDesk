import { Box, Button, List, ListItem, ListItemButton, Typography } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import utc from 'dayjs/plugin/utc';
import { useState, useEffect, useMemo, useCallback } from 'react';

import { logger } from '@shared/utils/logger.js';

dayjs.extend(utc);

const fileName = 'DateTime';
const log = logger.scope(fileName);

// Utilidad para mostrar una vista corta en logs
const fmt = (d) => (d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '');

const CustomActionBar = ({ onAccept, onCancel, setToday }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: theme.spacing(1),
                py: theme.spacing(1),
                px: theme.spacing(2),
                borderTop: `1px solid ${theme.palette.divider}`,
                mt: theme.spacing(1),
                width: '100%',
                alignItems: 'center',
            }}
        >
            <Button
                onClick={onCancel}
                color="secondary"
                variant="outlined"
                size="large"
                sx={{ fontWeight: 700, px: theme.spacing(2) }}
            >
                Cancelar
            </Button>
            <Button
                onClick={setToday}
                color="secondary"
                variant="outlined"
                size="large"
                sx={{
                    fontWeight: 700,
                    px: theme.spacing(2),
                    color: theme.palette.text.tertiary || theme.palette.text.primary,
                    borderColor: theme.palette.tertiary?.main || theme.palette.divider,
                    '&:hover': {
                        borderColor: theme.palette.tertiary?.main || theme.palette.divider,
                    },
                }}
            >
                Ahora
            </Button>
            <Button
                onClick={onAccept}
                color="primary"
                variant="outlined"
                size="large"
                autoFocus
                sx={{ fontWeight: 700, px: theme.spacing(2) }}
            >
                Aceptar
            </Button>
        </Box>
    );
};

const NumberColumn = ({ label, values, selected, onSelect }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                flex: 1,
                maxHeight: { xs: 220, sm: 360, md: 380 },
                height: 'auto',
                width: { xs: '100%', sm: 'fit-content' },
                minWidth: { xs: '100%', sm: 112 },
                maxWidth: { sm: 140 },
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                backgroundColor: theme.palette.background.paper,
                boxShadow: theme.shadows[1],
            }}
        >
            <Typography
                variant="subtitle2"
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: theme.spacing(4.5),
                    py: 0,
                    px: theme.spacing(1),
                    fontWeight: 'bold',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                    color: 'primary.main',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: { sm: theme.typography.pxToRem(12) },
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    position: 'sticky',
                    top: 0,
                    zIndex: 1,
                    backgroundColor: theme.palette.background.paper,
                }}
            >
                {label}
            </Typography>

            <List
                dense
                sx={{
                    width: '100%',
                    py: theme.spacing(0.75),
                    flex: '1 1 auto',
                    minHeight: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                }}
            >
                {values.map((val) => (
                    <ListItem key={val} disablePadding>
                        <ListItemButton
                            selected={val === selected}
                            onClick={() => onSelect(val)}
                            sx={{
                                textAlign: 'center',
                                mx: theme.spacing(0.5),
                                my: theme.spacing(0.25),
                                borderRadius: theme.shape.borderRadius,
                                py: theme.spacing(1),
                                fontWeight: 600,
                                minWidth: 0,
                                '&.Mui-selected': {
                                    backgroundColor: alpha(
                                        theme.palette.secondary.main,
                                        0.12
                                    ),
                                },
                                '&.Mui-selected:hover': {
                                    backgroundColor: alpha(
                                        theme.palette.secondary.main,
                                        0.18
                                    ),
                                },
                            }}
                        >
                            {val.toString().padStart(2, '0')}
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

export const DateTime = ({
    label,
    value,
    onChange,
    showTime = true,
    disabled = false,
    disablePastDates = false,
    open: openProp,
    onOpenChange,
}) => {
    const [open, setOpen] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const theme = useTheme();

    const isControlled = typeof openProp === 'boolean';
    const openState = isControlled ? openProp : open;

    // Para evitar spam, memo de previews
    const prevValue = useMemo(() => fmt(value), [value]);
    const _prevTemp = useMemo(() => fmt(tempValue), [tempValue]); // reservado para logs futuros

    useEffect(() => {
        if (openState) {
            setTempValue(value);
            log.info('abrir selector', { showTime, value: prevValue });
        }
    }, [openState, value, showTime, prevValue]);

    const handleOpen = useCallback(() => {
        if (!isControlled) setOpen(true);
        onOpenChange?.(true);
    }, [isControlled, onOpenChange]);

    const handleClose = useCallback(() => {
        if (!isControlled) setOpen(false);
        onOpenChange?.(false);
        log.info('cerrar selector');
    }, [isControlled, onOpenChange]);

    const handleAccept = useCallback(() => {
        onChange(tempValue);
        log.info('aceptar fecha/hora', { final: fmt(tempValue) });
        if (!isControlled) setOpen(false);
        onOpenChange?.(false);
    }, [onChange, tempValue, isControlled, onOpenChange]);

    const handleCancel = useCallback(() => {
        setTempValue(value);
        log.info('cancelar cambios', { restore: prevValue });
        if (!isControlled) setOpen(false);
        onOpenChange?.(false);
    }, [value, prevValue, isControlled, onOpenChange]);

    const handleSetToday = useCallback(() => {
        const now = dayjs();
        setTempValue(now);
        log.info('ajustar a ahora', { now: fmt(now) });
    }, []);

    // Deshabilitar días pasados si aplica
    const shouldDisableDate = (date) => {
        if (!disablePastDates) return false;
        return date.isBefore(dayjs().startOf('day'));
    };

    const onCalendarChange = (newDate) => {
        if (!newDate) return;
        const next = showTime
            ? newDate
                .hour(tempValue?.hour() ?? 0)
                .minute(tempValue?.minute() ?? 0)
                .second(tempValue?.second() ?? 0)
            : newDate.startOf('day');
        setTempValue(next);
        log.debug('cambio calendario', {
            day: newDate.format('YYYY-MM-DD'),
            temp: fmt(next),
        });
    };

    const onHourChange = (h) => {
        const next = tempValue.hour(h);
        setTempValue(next);
        log.debug('cambio hora', { hour: h, temp: fmt(next) });
    };

    const onMinuteChange = (m) => {
        const next = tempValue.minute(m);
        setTempValue(next);
        log.debug('cambio minuto', { minute: m, temp: fmt(next) });
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <DateTimePicker
                disabled={disabled}
                label={label}
                value={value}
                open={openState}
                onOpen={handleOpen}
                onClose={handleClose}
                format={showTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'}
                slotProps={{
                    textField: {
                        onClick: handleOpen,
                    },
                }}
                slots={{
                    layout: (props) => (
                        <Box
                            sx={{
                                width: { xs: 'min(100%, calc(100vw - 32px))', sm: 'auto' },
                                display: 'flex',
                                flexDirection: 'column',
                                maxHeight: { sm: 'min(80vh, 720px)' },
                                overflow: { sm: 'hidden' },
                            }}
                        >
                            {props.tabs}

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: {
                                        xs: '1fr',
                                        sm: showTime
                                            ? 'minmax(300px, 1fr) max-content max-content'
                                            : '1fr',
                                    },
                                    gridTemplateRows: {
                                        xs: 'auto auto auto',
                                        sm: showTime ? '1fr' : 'auto',
                                    },
                                    gap: theme.spacing(2),
                                    p: theme.spacing(2),
                                    alignItems: 'stretch',
                                    flex: '1 1 auto',
                                    minHeight: 0,
                                    height: 'auto',
                                    maxHeight: { sm: showTime ? 'min(70vh, 620px)' : 'none' },
                                    overflow: 'auto',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: { xs: 'auto', sm: '100%' },
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gridColumn: { xs: '1', sm: '1' },
                                        gridRow: { xs: '1', sm: '1' },
                                        justifySelf: 'stretch',
                                        alignSelf: 'stretch',
                                        minHeight: 0,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: theme.shape.borderRadius,
                                        backgroundColor: theme.palette.background.paper,
                                        boxShadow: theme.shadows[1],
                                        overflow: 'hidden',
                                    }}
                                >
                                    <DateCalendar
                                        views={['year', 'month', 'day']}
                                        openTo="day"
                                        value={tempValue}
                                        onChange={onCalendarChange}
                                        shouldDisableDate={shouldDisableDate}
                                        sx={{
                                            width: '100%',
                                            flex: { xs: '0 0 auto', sm: '1 1 auto' },
                                            px: theme.spacing(1),
                                            pt: theme.spacing(1),
                                        }}
                                    />
                                </Box>

                                {showTime && (
                                    <Box
                                        sx={{
                                            gridColumn: { xs: '1', sm: '2' },
                                            gridRow: { xs: '2', sm: '1' },
                                            justifySelf: { xs: 'stretch', sm: 'start' },
                                            alignSelf: 'stretch',
                                            height: 'auto',
                                            minHeight: 0,
                                        }}
                                    >
                                        <NumberColumn
                                            label="Horas"
                                            values={Array.from(
                                                { length: 24 },
                                                (_, i) => i
                                            )}
                                            selected={tempValue.hour()}
                                            onSelect={onHourChange}
                                        />
                                    </Box>
                                )}

                                {showTime && (
                                    <Box
                                        sx={{
                                            gridColumn: { xs: '1', sm: '3' },
                                            gridRow: { xs: '3', sm: '1' },
                                            justifySelf: { xs: 'stretch', sm: 'start' },
                                            alignSelf: 'stretch',
                                            height: 'auto',
                                            minHeight: 0,
                                        }}
                                    >
                                        <NumberColumn
                                            label="Minutos"
                                            values={Array.from(
                                                { length: 60 },
                                                (_, i) => i
                                            )}
                                            selected={tempValue.minute()}
                                            onSelect={onMinuteChange}
                                        />
                                    </Box>
                                )}
                            </Box>

                            <CustomActionBar
                                onAccept={() => {
                                    props.onAccept?.();
                                    handleAccept();
                                }}
                                onCancel={() => {
                                    props.onCancel?.();
                                    handleCancel();
                                }}
                                setToday={handleSetToday}
                            />
                        </Box>
                    ),
                }}
            />
        </LocalizationProvider>
    );
};
