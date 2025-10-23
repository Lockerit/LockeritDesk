import { useState, useEffect } from 'react';

import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import {
    Box, List, ListItem, ListItemButton, Typography
} from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';

dayjs.extend(utc);

const CustomActionBar = ({ onAccept, onCancel, setToday }) => {

    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: `${8 * scale}px ${16 * scale}px`,
                borderTop: `${1 * scale}px solid #ddd`,
                mt: 1 * scale,
                width: '100%',
                alignContent: 'center',
                alignItems: 'center',
                px: 5 * scale,
            }}
        >
            <Typography
                onClick={onCancel}
                color='secondary'
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
                color='secondary'
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
                color='secondary'
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

    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()

    return (
        <Box
            sx={{
                flex: 1,
                maxHeight: 300 * scale,
                border: `${1 * scale}px solid #ddd`,
                borderRadius: 2 * scale,
                overflowY: 'auto',
                overflowX: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
            }}
        >
            {/* Título de la columna */}
            <Typography
                variant='subtitle2'
                sx={{
                    p: 1,
                    fontWeight: 'bold',
                    borderBottom: `${1 * scale}px solid #eee`,
                    color: 'primary.main',
                }}
            >
                {label}
            </Typography>

            {/* Lista de números */}
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
    disablePastDates = false, // 👈 NUEVA PROP OPCIONAL
}) => {
    const [open, setOpen] = useState(false);
    const [tempValue, setTempValue] = useState(value); // estado temporal
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    useEffect(() => {
        if (open) {
            setTempValue(value); // resetea temporal al abrir
        }
    }, [open, value]);

    // Función para deshabilitar días pasados si se requiere
    const shouldDisableDate = (date) => {
        if (!disablePastDates) return false; // ❌ no deshabilitar nada
        return date.isBefore(dayjs().startOf("day")); // ✅ bloquea fechas anteriores al hoy
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
            <DateTimePicker
                disabled={disabled}
                label={label}
                value={value}
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                format={showTime ? "YYYY-MM-DD HH:mm" : "YYYY-MM-DD"}
                slots={{
                    layout: (props) => (
                        <Box>
                            {props.tabs}

                            {/* Calendario + columnas */}
                            <Box sx={{ display: "flex", gap: 2 * scale, p: 2 * scale }}>
                                <DateCalendar
                                    views={["year", "month", "day"]}
                                    openTo="day"
                                    value={tempValue}
                                    onChange={(newDate) => {
                                        if (!newDate) return;
                                        setTempValue(
                                            showTime
                                                ? newDate
                                                    .hour(tempValue?.hour() ?? 0)
                                                    .minute(tempValue?.minute() ?? 0)
                                                    .second(tempValue?.second() ?? 0)
                                                : newDate.startOf("day")
                                        );
                                    }}
                                    shouldDisableDate={shouldDisableDate} // 👈 aquí se aplica
                                />

                                {showTime && (
                                    <Box sx={{ display: "flex", gap: 2 * scale, alignItems: "center" }}>
                                        <NumberColumn
                                            label="Horas"
                                            values={Array.from({ length: 24 }, (_, i) => i)}
                                            selected={tempValue.hour()}
                                            onSelect={(h) => setTempValue(tempValue.hour(h))}
                                        />
                                        <NumberColumn
                                            label="Minutos"
                                            values={Array.from({ length: 60 }, (_, i) => i)}
                                            selected={tempValue.minute()}
                                            onSelect={(m) => setTempValue(tempValue.minute(m))}
                                        />
                                    </Box>
                                )}
                            </Box>

                            {/* Botones */}
                            <CustomActionBar
                                onAccept={() => {
                                    props.onAccept?.();
                                    onChange(tempValue);
                                    setOpen(false);
                                }}
                                onCancel={() => {
                                    props.onCancel?.();
                                    setTempValue(value);
                                    setOpen(false);
                                }}
                                setToday={() => setTempValue(dayjs())}
                            />
                        </Box>
                    ),
                }}
            />
        </LocalizationProvider>
    );
};