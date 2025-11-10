// AppbarBar.jsx — alineado y con logging unificado
import {
    Logout,
    CancelPresentation,
    CheckCircleOutline,
    HighlightOff,
} from '@mui/icons-material';
import {
    AppBar,
    Toolbar,
    Typography,
    Avatar,
    Box,
    Menu,
    MenuItem,
    ListItemIcon,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import avatarImg from '@assets/Icono.jpg';
import { useUser } from '@shared/context/UserContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';

import { Clock } from './Clock.jsx';

const USER_STORAGE_KEY = 'userInit';
const fileName = 'AppbarBar';
const log = logger.scope(fileName);

export const AppbarBar = ({ position = 'static', containerPadding = '2.5%' }) => {
    const { userInit, setUserInit } = useUser();
    const [showData, setShowData] = useState(false);
    const [avatarSelect, setAvatarSelect] = useState(avatarImg);
    const [anchorEl, setAnchorEl] = useState(null);
    const [fullScreen, setFullScreen] = useState(false);

    const config = useElectronConfig();
    const avatarBoxRef = useRef(null);
    const navigate = useNavigate();
    const theme = useTheme();

    // tamaño de avatar basado en theme
    const sizeAvatar = Math.max(40, Math.min(80, parseInt(theme.spacing(6), 10) || 50));

    useEffect(() => {
        let alive = true;
        window?.electronAPI
            ?.getState()
            .then((st) => {
                if (alive) setFullScreen(!!st.fullscreen);
            })
            .catch(() => { });
        log.info('Estado de ventana obtenido al iniciar AppbarBar');
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        log.info('Montando AppbarBar');
    }, []);

    useEffect(() => {
        if (!userInit || !config) return;

        const isAuth = Boolean(
            userInit?.authenticatedOpera || userInit?.authenticatedAdmin
        );
        setShowData(isAuth);

        if (isAuth) {
            const avatarPath = config?.login?.avatarPath ?? '';
            const valid = getValidAvatar(avatarPath);
            setAvatarSelect(valid);
            log.debug(
                `Usuario autenticado | avatar=${valid === avatarImg ? 'default' : 'custom'}`
            );
        } else {
            setAvatarSelect(avatarImg);
            log.debug('Usuario no autenticado');
        }
    }, [config, userInit]);

    const getValidAvatar = (avatar) => {
        if (
            typeof avatar === 'string' &&
            avatar.trim() !== '' &&
            (/^https?:/.test(avatar) ||
                /^data:/.test(avatar) ||
                /\.(jpg|jpeg|png)$/i.test(avatar))
        ) {
            return avatar;
        }
        return avatarImg;
    };

    const persistUser = (updatedUser) => {
        setUserInit(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
        log.debug('Menú de usuario abierto');
    };

    const handleMenuClose = () => {
        const updatedUser = { ...userInit, closeSession: false, closeWindow: false };
        persistUser(updatedUser);
        setAnchorEl(null);
        setTimeout(() => avatarBoxRef.current?.focus?.(), 100);
        log.debug('Menú de usuario cerrado');
    };

    const handleLogout = () => {
        handleMenuClose();
        const updatedUser = { ...userInit, closeSession: true, closeWindow: false };
        persistUser(updatedUser);
        navigate('/', { replace: true });
        log.info('Cerrar sesión solicitado');
    };

    const openConfirmClose = () => {
        const updatedUser = { ...userInit, closeSession: false, closeWindow: true };
        persistUser(updatedUser);
        setAnchorEl(null);
        navigate('/', { replace: true });
        log.info('Salir solicitado');
    };

    const applyFullScreen = async (next) => {
        setFullScreen(!!next); // optimista
        const st = await window?.electronAPI?.setFullScreen(!!next);
        log.info(`Pantalla completa → ${!!st.fullscreen}`);
        setFullScreen(!!st.fullscreen); // confirma estado real
    };

    return (
        <AppBar
            position={position}
            elevation={0}
            sx={{ height: '100%', justifyContent: 'center' }}
        >
            <Toolbar
                disableGutters
                sx={{
                    px: containerPadding,
                    minHeight: '100%',
                    gap: theme.spacing(2),
                }}
            >
                {/* Izquierda: usuario */}
                <Box sx={{ flex: 1 }}>
                    <Box
                        ref={avatarBoxRef}
                        tabIndex={-1}
                        sx={{
                            display: 'flex',
                            gap: theme.spacing(1),
                            cursor: 'pointer',
                            alignItems: 'center',
                        }}
                        onClick={handleMenuOpen}
                    >
                        <Avatar
                            alt="Avatar"
                            src={avatarSelect}
                            sx={{ width: sizeAvatar, height: sizeAvatar }}
                        />
                        {showData && (
                            <>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {(config?.customer || '')}
                                    {' | '}
                                </Typography>
                                <Typography variant="h6">
                                    {userInit?.authenticatedOpera
                                        ? config?.login?.userOpera || ''
                                        : userInit?.authenticatedAdmin
                                            ? config?.login?.userAdmin || ''
                                            : ''}
                                </Typography>
                            </>
                        )}
                    </Box>
                </Box>

                {/* Centro: reloj */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Clock />
                </Box>

                {/* Derecha: ubicación */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: theme.spacing(1),
                    }}
                >
                    {showData && (
                        <>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {(config?.pointName || '')}
                                {' | '}
                            </Typography>
                            <Typography variant="h6">{config?.pointId || ''}</Typography>
                        </>
                    )}
                </Box>
            </Toolbar>

            {/* Menú */}
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
                    Cerrar aplicación
                </MenuItem>
                <MenuItem onClick={applyFullScreen.bind(null, !fullScreen)}>
                    <ListItemIcon>
                        {fullScreen ? <HighlightOff /> : <CheckCircleOutline />}
                    </ListItemIcon>
                    {fullScreen ? 'Pantalla completa (No)' : 'Pantalla completa (Sí)'}
                </MenuItem>
            </Menu>
        </AppBar>
    );
};