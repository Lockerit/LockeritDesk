import { Box, List, ListItem, ListItemButton, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
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
                py: theme.spacing(1),
                px: theme.spacing(2),
                borderTop: '1px solid #ddd',
                mt: theme.spacing(1),
                width: '100%',
                alignItems: 'center',
            }}
        >
            <Typography
                onClick={onCancel}
                color="secondary"
                sx={{
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '&:hover': { color: 'primary.main' },
                }}
            >
                Cancelar
            </Typography>
            <Typography
                onClick={setToday}
                color="secondary"
                sx={{
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '&:hover': { color: 'primary.main' },
                }}
            >
                Ahora
            </Typography>
            <Typography
                onClick={onAccept}
                autoFocus
                color="secondary"
                sx={{
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    '&:hover': { color: 'primary.main' },
                }}
            >
                Aceptar
            </Typography>
        </Box>
    );
};

const NumberColumn = ({ label, values, selected, onSelect }) => {
    const theme = useTheme();

    return (
        <Box
            sx={{
                flex: 1,
                maxHeight: 300,
                border: '1px solid #ddd',
                borderRadius: theme.spacing(1),
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            <Typography
                variant="subtitle2"
                sx={{
                    p: theme.spacing(1),
                    fontWeight: 'bold',
                    borderBottom: '1px solid #eee',
                    color: 'primary.main',
                }}
            >
                {label}
            </Typography>

            <List dense sx={{ width: '100%' }}>
                {values.map((val) => (
                    <ListItem key={val} disablePadding>
                        <ListItemButton
                            selected={val === selected}
                            onClick={() => onSelect(val)}
                            sx={{ textAlign: 'center' }}
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
}) => {
    const [open, setOpen] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    const theme = useTheme();

    // Para evitar spam, memo de previews
    const prevValue = useMemo(() => fmt(value), [value]);
    const _prevTemp = useMemo(() => fmt(tempValue), [tempValue]); // se mantiene por si se quiere usar en logs futuros

    useEffect(() => {
        if (open) {
            setTempValue(value);
            log.info('abrir selector', { showTime, value: prevValue });
        }
    }, [open, value, showTime, prevValue]);

    const handleClose = useCallback(() => {
        setOpen(false);
        log.info('cerrar selector');
    }, []);

    const handleAccept = useCallback(() => {
        onChange(tempValue);
        log.info('aceptar fecha/hora', { final: fmt(tempValue) });
        setOpen(false);
    }, [onChange, tempValue]);

    const handleCancel = useCallback(() => {
        setTempValue(value);
        log.info('cancelar cambios', { restore: prevValue });
        setOpen(false);
    }, [value, prevValue]);

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

    // Log de cambios de calendario
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
                open={open}
                onOpen={() => setOpen(true)}
                onClose={handleClose}
                format={showTime ? 'YYYY-MM-DD HH:mm' : 'YYYY-MM-DD'}
                slots={{
                    layout: (props) => (
                        <Box>
                            {props.tabs}

                            <Box
                                sx={{
                                    display: 'flex',
                                    gap: theme.spacing(2),
                                    p: theme.spacing(2),
                                }}
                            >
                                <DateCalendar
                                    views={['year', 'month', 'day']}
                                    openTo="day"
                                    value={tempValue}
                                    onChange={onCalendarChange}
                                    shouldDisableDate={shouldDisableDate}
                                />

                                {showTime && (
                                    <Box
                                        sx={{
                                            display: 'flex',
                                            gap: theme.spacing(2),
                                            alignItems: 'center',
                                        }}
                                    >
                                        <NumberColumn
                                            label="Horas"
                                            values={Array.from({ length: 24 }, (_, i) => i)}
                                            selected={tempValue.hour()}
                                            onSelect={onHourChange}
                                        />
                                        <NumberColumn
                                            label="Minutos"
                                            values={Array.from({ length: 60 }, (_, i) => i)}
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
