import { Logout, CancelPresentation } from '@mui/icons-material';
import {
    AppBar, Toolbar, Typography, Avatar, Box, Menu, MenuItem, ListItemIcon
} from '@mui/material';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';


import avatarImg from '@assets/Icono.jpg';
import { useUser } from '@shared/context/UserContext.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';

import { Clock } from './Clock.jsx';

const USER_STORAGE_KEY = 'userInit';

export const AppbarBar = () => {
    const { userInit, setUserInit } = useUser();
    const [closeSession, setCloseSession] = useState(false);
    const [showData, setShowData] = useState(false);
    const [avatarSelect, setAvatarSelect] = useState(avatarImg);
    const [anchorEl, setAnchorEl] = useState(null);
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()
    const sizeAvatar = Math.max(30, 50 * scale); // mínimo 40px, escala hasta 80px o más

    const config = useElectronConfig();
    const avatarBoxRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!userInit || !config) return;

        if (userInit?.authenticatedOpera || userInit?.authenticatedAdmin) {
            setShowData(true);
            const avatarPath = config?.login?.avatarPath ?? '';
            setAvatarSelect(getValidAvatar(avatarPath));
        } else {
            setShowData(false);
            setAvatarSelect(avatarImg);
            if (userInit?.closeSession) setCloseSession(false);
        }
    }, [config, userInit]);

    const getValidAvatar = (avatar) => {
        if (
            typeof avatar === 'string' &&
            avatar.trim() !== '' &&
            (/^https?:/.test(avatar) || /^data:/.test(avatar) || /\.(jpg|jpeg|png)$/i.test(avatar))
        ) {
            return avatar;
        }
        return avatarImg;
    }

    const persistUser = (updatedUser) => {
        setUserInit(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    }

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        const updatedUser = { ...userInit, closeWindow: false };
        persistUser(updatedUser);
        setAnchorEl(null);

        setTimeout(() => {
            avatarBoxRef.current?.focus?.();
        }, 100);
    };

    const handleLogout = () => {
        setCloseSession(true);
        handleMenuClose();

        const updatedUser = { ...userInit, closeSession: true };
        persistUser(updatedUser);
        navigate('/', { replace: true });
    };

    const openConfirmClose = () => {
        const updatedUser = { ...userInit, closeWindow: true };
        persistUser(updatedUser);
        setAnchorEl(null);
        navigate('/', { replace: true });
    };

    return (
        <AppBar
            position="fixed"
            elevation={0}
            sx={{
                height: `${Math.max(50, Math.min(100, 70 * scale))}px`, // entre 30px y 80px
                justifyContent: 'center', // centra el contenido verticalmente
            }}
        >
            <Toolbar>
                {/* Usuario (izquierda) */}
                <Box sx={{ flex: 1 }}>
                    <Box
                        ref={avatarBoxRef}
                        tabIndex={-1}
                        sx={{ display: 'flex', gap: 1 * scale, cursor: 'pointer', alignItems: 'center' }}
                        onClick={handleMenuOpen}
                    >
                        <Avatar alt="Avatar" src={avatarSelect}
                            sx={{
                                width: sizeAvatar,
                                height: sizeAvatar
                            }}
                        />
                        {showData && (
                            <>
                                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                    {(config?.customer || '')}{' | '}
                                </Typography>
                                <Typography variant="h5">
                                    {(userInit?.authenticatedOpera ? (config?.login?.userOpera || '') : userInit?.authenticatedAdmin ? (config?.login?.userAdmin || '') : '')}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>

                {/* Reloj (centro) */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Clock />
                </Box>

                {/* Ubicación (derecha) */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 * scale }}>
                    {showData && (
                        <>
                            <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                                {(config?.pointName || '')} {' | '}
                            </Typography>
                            <Typography variant="h5">
                                {(config?.pointId || '')}
                            </Typography>
                        </>
                    )}
                </Box>
            </Toolbar>

            {/* Menú desplegable */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                disableAutoFocusItem
            >
                {showData && (
                    <MenuItem onClick={handleLogout}>
                        <ListItemIcon>
                            <Logout />
                        </ListItemIcon>
                        Cerrar sesión
                    </MenuItem>
                )}
                <MenuItem onClick={openConfirmClose}>
                    <ListItemIcon>
                        <CancelPresentation />
                    </ListItemIcon>
                    Salir
                </MenuItem>
            </Menu>
        </AppBar>
    );
}