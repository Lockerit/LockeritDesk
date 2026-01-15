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
    Box,
    Menu,
    MenuItem,
    ListItemIcon,
    IconButton,
    useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import avatarImg from '@assets/icono.jpg';
import { useUser } from '@shared/context/UserContext.jsx';
import { useAssetPath } from '@shared/hooks/useAssetPath.js';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';

import { Clock } from './Clock.jsx';

const USER_STORAGE_KEY = 'userInit';
const fileName = 'AppbarBar';
const log = logger.scope(fileName);

export const AppbarBar = ({ position = 'static', containerPadding = '2.5%' }) => {
    const { userInit, setUserInit } = useUser();
    const [showData, setShowData] = useState(false);
    const [showOptFullScreen, setShowOptFullScreen] = useState(false);
    const [avatarSelect, setAvatarSelect] = useState(avatarImg);
    const [anchorEl, setAnchorEl] = useState(null);
    const [fullScreen, setFullScreen] = useState(false);

    const config = useElectronConfig();
    const avatarPath = useAssetPath(config?.paramsHtml?.imagesPaths?.avatar?.name);
    const iconoPath = useAssetPath(config?.paramsHtml?.imagesPaths?.iconoLogin?.name);
    const avatarBoxRef = useRef(null);
    const navigate = useNavigate();
    const theme = useTheme();
    const isXs = useMediaQuery(theme.breakpoints.down('sm'));

    // tamaño de avatar basado en theme (si se necesita más adelante calcular dinámicamente)

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

        const isAuthOpera = Boolean(userInit?.authenticatedOpera);
        setShowOptFullScreen(isAuthOpera);

        if (isAuth) {
            if (avatarPath && avatarPath.trim() !== '') {
                setAvatarSelect(avatarPath);
                log.debug('Usuario autenticado | avatar=custom');
            } else {
                setAvatarSelect(avatarImg);
                log.debug('Usuario autenticado | avatar=default');
            }
        } else {
            setAvatarSelect(iconoPath || avatarImg);
            log.debug('Usuario no autenticado');
        }
    }, [config, userInit, avatarPath, iconoPath]);

    const persistUser = (updatedUser) => {
        setUserInit(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
    };

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
        log.debug('Menú de usuario abierto');
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setTimeout(() => avatarBoxRef.current?.focus?.(), 100);
        log.debug('Menú de usuario cerrado');
    };

    const handleLogout = () => {
        const updatedUser = {
            ...userInit,
            closeSession: true,
            closeWindow: false,
        };
        persistUser(updatedUser);
        setAnchorEl(null);
        navigate('/', { replace: true });
        log.info('Cerrar sesión solicitado');
    };

    const openConfirmClose = () => {
        const updatedUser = {
            ...userInit,
            closeSession: false,
            closeWindow: true,
        };
        persistUser(updatedUser);
        setAnchorEl(null);
        navigate('/', { replace: true });
        log.info('Salir solicitado');
    };

    const applyFullScreen = async (next) => {
        setFullScreen(!!next);
        const st = await window?.electronAPI?.setFullScreen(!!next);
        log.info(`Pantalla completa → ${!!st?.fullscreen}`);
        setFullScreen(!!st?.fullscreen);
        setAnchorEl(null);
    };

    return (
        <AppBar
            position={position}
            elevation={0}
            sx={{ height: { xs: theme.spacing(7), sm: '100%' }, justifyContent: 'center' }}
        >
            <Toolbar
                disableGutters
                sx={{ px: { xs: 1, sm: containerPadding }, minHeight: '100%', gap: theme.spacing(2) }}
            >
                {/* Izquierda: usuario */}
                <Box sx={{ flex: 1 }}>
                    <Box
                        ref={avatarBoxRef}
                        tabIndex={-1}
                        sx={{ display: 'flex', gap: theme.spacing(1), cursor: 'pointer', alignItems: 'center' }}
                        onClick={handleMenuOpen}
                    >
                        {config?.paramsHtml?.imagesPaths?.avatar?.enabled && (
                            <Box
                                sx={{
                                    width: { xs: theme.spacing(6), sm: theme.spacing(7), md: theme.spacing(8), lg: theme.spacing(9) },
                                    height: { xs: theme.spacing(6), sm: theme.spacing(7), md: theme.spacing(8), lg: theme.spacing(9) },
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    backgroundColor: '#ffffff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundImage: `url(${avatarSelect})`,
                                    backgroundSize: config?.paramsHtml?.imagesPaths?.avatar?.size || '80%',
                                    backgroundPosition: 'center',
                                    backgroundRepeat: 'no-repeat',
                                }}
                            />
                        )}

                        {!isXs && showData && (
                            <>
                                <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                                    {config?.customer || ''}{' | '}
                                </Typography>
                                <Typography variant="h6" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
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

                {/* Centro: reloj (ocultar en xs para ahorrar espacio) */}
                {!isXs && (
                    <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                        <Clock />
                    </Box>
                )}

                {/* Derecha: ubicación o menú de acciones */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: theme.spacing(1) }}>
                    {showData && !isXs && (
                        <>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '0.85rem', sm: '1rem' } }}>{config?.pointName || ''}{' | '}</Typography>
                            <Typography variant="h6" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>{config?.pointId || ''}</Typography>
                        </>
                    )}

                    {isXs && (
                        <IconButton size="small" color="inherit" aria-label="menu" onClick={(e) => setAnchorEl(e.currentTarget)}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <rect x="3" y="6" width="18" height="2" fill="currentColor" />
                                <rect x="3" y="11" width="18" height="2" fill="currentColor" />
                                <rect x="3" y="16" width="18" height="2" fill="currentColor" />
                            </svg>
                        </IconButton>
                    )}
                </Box>
            </Toolbar>

            {/* Menú */}
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} disableAutoFocusItem>
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
                {!showOptFullScreen && (
                    <MenuItem onClick={applyFullScreen.bind(null, !fullScreen)}>
                        <ListItemIcon>{fullScreen ? <HighlightOff /> : <CheckCircleOutline />}</ListItemIcon>
                        {fullScreen ? 'Pantalla completa (No)' : 'Pantalla completa (Sí)'}
                    </MenuItem>
                )}
            </Menu>
        </AppBar>
    );
};