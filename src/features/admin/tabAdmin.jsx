import { TabContext, TabList, TabPanel } from '@mui/lab';
import { Box, Tab } from '@mui/material';
import { useEffect, useState } from 'react';

import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { logger } from '@shared/utils/logger.js';

import { AdminLockers } from './AdminLockers.jsx';
import { ReportLockers } from './ReportLockers.jsx';

const fileName = 'TabAdmin';
const log = logger.scope(fileName);

export const TabAdmin = () => {
    const [value, setValue] = useState('1');
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    // Altura base de la barra de tabs
    const tabBarBase = 70 * scale; // altura típica MUI Tabs
    const tabBarHeight = Math.max(40, Math.min(70, tabBarBase * scale));

    useEffect(() => {
        // [+log]
        log.info(`Montando TabAdmin valorInicial=${value} scale=${scale}`);
    }, [scale, value]); // solo una vez

    const handleChange = (_event, newValue) => {
        setValue(newValue);
        // [+log]
        log.info(`Cambio de pestaña → ${newValue === '1' ? 'Estado Casilleros' : 'Reporte'}`);
    };

    return (
        <Box sx={{ width: '100%', height: '100%', display: "flex", flexDirection: "column" }}>
            <TabContext value={value}>
                {/* Barra de Tabs */}
                <Box
                    sx={{
                        height: `${tabBarHeight}px`,
                        display: "flex",
                        alignItems: "center",
                    }}
                >
                    <TabList
                        onChange={handleChange}
                        aria-label="tabs Administrativo"
                        sx={{
                            minHeight: `${tabBarHeight}px`,
                            '& .MuiTab-root': {
                                minHeight: `${tabBarHeight}px`,
                            },
                        }}
                    >
                        <Tab label="Estado Casilleros" value="1" />
                        <Tab label="Reporte" value="2" />
                    </TabList>
                </Box>

                {/* Contenido - ocupa lo que queda */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                    <TabPanel
                        value="1"
                        sx={{ flex: 1, height: "100%", p: 0 }} // aquí scroll solo del contenido
                    >
                        <AdminLockers />
                    </TabPanel>
                    <TabPanel
                        value="2"
                        sx={{ flex: 1, height: "100%", p: 2 * scale }}
                    >
                        <ReportLockers />
                    </TabPanel>
                </Box>
            </TabContext>
        </Box>
    );
};
