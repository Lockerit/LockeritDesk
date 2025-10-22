import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { useWindowSizeContext } from '@shared/context/windowSizeContext.jsx';
import { AdminLockers } from './AdminLockers.jsx';
import { ReportLockers } from './ReportLockers.jsx';

const fileName = 'TabAdmin';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export const TabAdmin = () => {
    const [value, setValue] = useState('1');
    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    // Altura base de la barra de tabs
    const tabBarBase = 70 * scale; // altura típica MUI Tabs
    const tabBarHeight = Math.max(40, Math.min(70, tabBarBase * scale));

    const handleChange = (event, newValue) => {
        setValue(newValue);
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
                        sx={{ flex: 1, height: "100%", p: 0}} // aquí scroll solo del contenido
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
