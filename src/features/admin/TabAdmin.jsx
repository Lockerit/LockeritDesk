// TabAdmin.jsx
import { Tabs, Tab, Box, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';

import { logger } from '@shared/utils/logger.js';

import { AdminLockers } from './AdminLockers.jsx';
import { ReportLockers } from './ReportLockers.jsx';

const fileName = 'TabAdmin';
const log = logger.scope(fileName);
const ADMIN_TAB_KEY = 'adminLastTab';

export const TabAdmin = () => {
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));

    const [value, setValue] = useState(() => {
        if (typeof window === 'undefined') return '1';
        const stored = window.localStorage.getItem(ADMIN_TAB_KEY);
        return stored || '1';
    });

    useEffect(() => {
        log.info('Montando TabAdmin');
        return () => {
            log.info('Desmontando TabAdmin');
        };
    }, []);

    const handleChange = (_event, newValue) => {
        setValue(newValue);
        try {
            window.localStorage.setItem(ADMIN_TAB_KEY, newValue);
        } catch (e) {
            log.error(`Error guardando tab admin: ${String(e)}`);
        }

        log.info(
            `Cambio de pestaña → ${newValue === '1' ? 'Estado Casilleros' : 'Reporte'
            }`
        );
    };

    return (
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            {/* Barra de tabs */}
            <Box
                sx={{
                    height: isXs ? theme.spacing(6) : theme.spacing(8),
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                <Tabs
                    value={value}
                    onChange={handleChange}
                    aria-label="tabs Administrativo"
                    variant={isXs ? 'scrollable' : 'standard'}
                    scrollButtons={isXs ? 'auto' : 'off'}
                    allowScrollButtonsMobile
                    sx={{
                        minHeight: isXs ? theme.spacing(6) : theme.spacing(8),
                        '& .MuiTab-root': {
                            minHeight: isXs ? theme.spacing(6) : theme.spacing(8),
                            fontSize: isXs ? theme.typography.subtitle2.fontSize : theme.typography.h6.fontSize,
                            textTransform: 'none',
                            fontWeight: 'bold',
                            px: isXs ? theme.spacing(1.5) : theme.spacing(3),
                        },
                    }}
                >
                    <Tab label="Estado Casilleros" value="1" />
                    <Tab label="Reporte" value="2" />
                </Tabs>
            </Box>

            {/* Contenido: ambos SIEMPRE montados */}
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                }}
            >
                {/* AdminLockers */}
                <Box
                    role="tabpanel"
                    hidden={value !== '1'}
                    sx={{
                        display: value === '1' ? 'flex' : 'none',
                        position: 'absolute',
                        inset: 0,
                        flexDirection: 'column',
                    }}
                >
                    <AdminLockers />
                </Box>

                {/* ReportLockers */}
                <Box
                    role="tabpanel"
                    hidden={value !== '2'}
                    sx={{
                        display: value === '2' ? 'flex' : 'none',
                        position: 'absolute',
                        inset: 0,
                        flexDirection: 'column',
                    }}
                >
                    <ReportLockers />
                </Box>
            </Box>
        </Box>
    );
};
