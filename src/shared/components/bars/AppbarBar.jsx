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
            sx={{
                justifyContent: 'center',
                minHeight: {
                    xs: theme.spacing(7),
                    sm: theme.spacing(8),
                    md: theme.spacing(9),
                },
            }}
        >
            <Toolbar
                disableGutters
                sx={{
                    px: { xs: 1.5, sm: containerPadding },
                    minHeight: 'unset',
                    gap: theme.spacing(2),
                }}
            >
                {/* Izquierda: usuario */}
                <Box sx={{ flex: 1 }}>
                    <Box
                        ref={avatarBoxRef}
                        tabIndex={-1}
                        role="button"
                        aria-haspopup="menu"
                        aria-expanded={anchorEl ? 'true' : undefined}
                        sx={{
                            display: 'flex',
                            gap: theme.spacing(1.5),
                            cursor: 'pointer',
                            alignItems: 'center',
                            minWidth: 0,
                        }}
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
                                    backgroundColor: theme.palette.background.paper,
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

                        {showData && (
                            <Box
                                sx={{
                                    display: 'flex',
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    alignItems: { xs: 'flex-start', sm: 'baseline' },
                                    gap: { xs: 0, sm: theme.spacing(1) },
                                    minWidth: 0,
                                }}
                            >
                                <Typography
                                    variant="h6"
                                    noWrap
                                    sx={{
                                        fontWeight: 800,
                                        fontSize: {
                                            xs: 'clamp(0.95rem, 2.6vw, 1.05rem)',
                                            sm: 'clamp(1.0rem, 1.7vw, 1.15rem)',
                                        },
                                        lineHeight: 1.1,
                                        maxWidth: { xs: '40vw', sm: 'unset' },
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {config?.customer || ''}
                                    {!isXs ? ' |' : ''}
                                </Typography>
                                <Typography
                                    variant="h6"
                                    noWrap
                                    sx={{
                                        fontWeight: 600,
                                        fontSize: {
                                            xs: 'clamp(0.9rem, 2.4vw, 1.0rem)',
                                            sm: 'clamp(0.95rem, 1.6vw, 1.1rem)',
                                        },
                                        lineHeight: 1.1,
                                        maxWidth: { xs: '40vw', sm: 'unset' },
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {userInit?.authenticatedOpera
                                        ? config?.login?.userOpera || ''
                                        : userInit?.authenticatedAdmin
                                            ? config?.login?.userAdmin || ''
                                            : ''}
                                </Typography>
                            </Box>
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
                    {showData && (
                        <Box
                            sx={{
                                display: { xs: 'none', sm: 'flex' },
                                alignItems: 'baseline',
                                gap: theme.spacing(1),
                                minWidth: 0,
                            }}
                        >
                            <Typography
                                variant="h6"
                                noWrap
                                sx={{
                                    fontWeight: 800,
                                    fontSize: 'clamp(1.0rem, 1.7vw, 1.15rem)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '22vw',
                                }}
                            >
                                {config?.pointName || ''} |
                            </Typography>
                            <Typography
                                variant="h6"
                                noWrap
                                sx={{
                                    fontWeight: 600,
                                    fontSize: 'clamp(0.95rem, 1.6vw, 1.1rem)',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '14vw',
                                }}
                            >
                                {config?.pointId || ''}
                            </Typography>
                        </Box>
                    )}

                    {showData && (
                        <Typography
                            variant="h6"
                            noWrap
                            sx={{
                                display: { xs: 'block', sm: 'none' },
                                fontWeight: 700,
                                fontSize: 'clamp(0.9rem, 2.6vw, 1.0rem)',
                                lineHeight: 1.1,
                                maxWidth: '34vw',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                textAlign: 'right',
                            }}
                        >
                            {(config?.pointName || '').trim()}
                            {config?.pointId ? ` | ${config.pointId}` : ''}
                        </Typography>
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