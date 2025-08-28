import { useState, useEffect, React } from 'react';
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";
import { useWindowSize } from '../hooks/useWindowSize.js'; // Hook para tamaño pantalla
import {
    Box,
    List,
    ListItem,
    ListItemButton,
    Typography
} from "@mui/material";
import dayjs from "dayjs";
import "dayjs/locale/es";
import utc from "dayjs/plugin/utc";
dayjs.extend(utc);


const CustomActionBar = ({ onAccept, onCancel, setToday }) => {

    const { width, height, factor } = useWindowSize();
    const scale = factor || 1; // de tu hook useElectronScreenData()

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
                px: 10 * scale,
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

    const { width, height, factor } = useWindowSize();
    const scale = factor || 1; // de tu hook useElectronScreenData()

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

const DateTime = ({ label, value, onChange }) => {

    const [open, setOpen] = useState(false);
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1; // de tu hook useElectronScreenData()

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='es'>
            <DateTimePicker
                label={label}
                value={value}
                onChange={(newValue) => newValue && onChange(newValue)} // sincroniza el state
                open={open}
                onOpen={() => setOpen(true)}
                onClose={() => setOpen(false)}
                format='YYYY-MM-DD HH:mm'
                slots={{
                    layout: (props) => (
                        <Box>
                            {/* Tabs */}
                            {props.tabs}

                            {/* Calendario + columnas */}
                            <Box sx={{ display: 'flex', gap: 2 * scale, p: 2 * scale }}>
                                <DateCalendar
                                    views={['year', 'month', 'day']}
                                    openTo='day'
                                    value={value}
                                    onChange={(newDate) => {
                                        if (!newDate) return;
                                        onChange(
                                            newDate
                                                .hour(value.hour())
                                                .minute(value.minute())
                                                .second(value.second())
                                        );
                                    }}
                                />
                                <Box sx={{ display: 'flex', gap: 2 * scale, alignItems: 'center' }}>
                                    <NumberColumn
                                        label='Horas'
                                        values={Array.from({ length: 24 }, (_, i) => i)}
                                        selected={value.hour()}
                                        onSelect={(h) => onChange(value.hour(h))}
                                    />
                                    <NumberColumn
                                        label='Minutos'
                                        values={Array.from({ length: 60 }, (_, i) => i)}
                                        selected={value.minute()}
                                        onSelect={(m) => onChange(value.minute(m))}
                                    />
                                    {/* <NumberColumn
                                        label="Segundos"
                                        values={Array.from({ length: 60 }, (_, i) => i)}
                                        selected={value.second()}
                                        onSelect={(s) => onChange(value.second(s))}
                                    /> */}
                                </Box>
                            </Box>

                            {/* Botones */}
                            <CustomActionBar
                                onAccept={() => {
                                    props.onAccept?.();
                                    setOpen(false)
                                }}
                                onCancel={() => {
                                    props.onCancel?.();
                                    setOpen(false);
                                }}
                                setToday={() => onChange(dayjs())}
                            />
                        </Box>
                    ),
                }}
            />
        </LocalizationProvider>
    );
};

export default DateTime;
