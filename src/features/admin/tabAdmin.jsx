import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import TabContext from '@mui/lab/TabContext';
import TabList from '@mui/lab/TabList';
import TabPanel from '@mui/lab/TabPanel';
import { useWindowSize } from "../hooks/useWindowSize.js";
import AdminLockers from './adminLockers.jsx';
import ReportLockers from './reportLockers.jsx';

const Tabadmin = () => {
    const [value, setValue] = useState('1');
    const { factor } = useWindowSize();
    const scale = factor || 1;

    // Altura base de la barra de tabs
    const tabBarBase = 48 * scale; // altura típica MUI Tabs
    const tabBarHeight = Math.max(30, Math.min(80, tabBarBase * scale));

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
                                fontSize: `${Math.max(12, Math.min(18, 14 * scale))}px`,
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

export default Tabadmin;
