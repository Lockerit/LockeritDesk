import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Avatar,
    Box,
    Menu,
    MenuItem,
} from '@mui/material';
import avatarImg from '../../assets/Icono.jpg';
import Clock from './clock.jsx';
import { useUser } from '../context/userContext.jsx';
import ConfirmDialog from '../dialogs/confirmDialog.jsx';
import { useElectronConfig } from '../hooks/useConfig.js';
import {
    Logout,
    SupervisorAccount,
    CancelPresentation,
    Keyboard
} from '@mui/icons-material';

const USER_STORAGE_KEY = 'userInit';
const fileName = 'appbar';

export default function DenseAppBar() {
    const { userInit, setUserInit } = useUser();
    const [closeSession, setCloseSession] = useState(false);
    const [showData, setShowData] = useState(false);
    const [showAdmin, setShowAdmin] = useState(true);
    const [avatarSelect, setAvatarSelect] = useState(avatarImg);
    const [anchorEl, setAnchorEl] = useState(null);

    const config = useElectronConfig();
    const avatarBoxRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!userInit || !config) return;

        const { authenticated, closeSession, adminWindowInto } = userInit;

        if (authenticated || adminWindowInto) {
            setShowData(true);
            const avatarPath = config?.login?.avatarPath ?? '';
            setAvatarSelect(getValidAvatar(avatarPath));
            setShowAdmin(false);
        } else {
            setShowAdmin(true);
            setShowData(false);
            setAvatarSelect(avatarImg);
            if (closeSession) setCloseSession(false);
        }
    }, [config, userInit]);

    function getValidAvatar(avatar) {
        if (
            typeof avatar === 'string' &&
            avatar.trim() !== '' &&
            (/^https?:/.test(avatar) || /^data:/.test(avatar) || /\.(jpg|jpeg|png)$/i.test(avatar))
        ) {
            return avatar;
        }
        return avatarImg;
    }

    function persistUser(updatedUser) {
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

    const acceptConfirmation = () => {
        setConfirmDialogOpen(false);
        // Aquí iría la lógica para cerrar la ventana si es necesario
    };

    const cancelConfirmation = () => {
        setConfirmDialogOpen(false);
    };

    const openConfirmClose = () => {
        const updatedUser = { ...userInit, closeWindow: true };
        persistUser(updatedUser);
        setAnchorEl(null);
        navigate('/', { replace: true });
    };

    const openKeyBoard = () => {
        setAnchorEl(null);
        window.electronAPI?.openKeyboard();
    };

    const openAdmin = () => {
        const updatedUser = { ...userInit, adminWindow: true };
        persistUser(updatedUser);
        setAnchorEl(null);
        navigate('/', { replace: true });
    };

    return (
        <AppBar position="fixed" elevation={0}>
            <Toolbar>

                {/* Usuario (izquierda) */}
                <Box sx={{ flex: 1 }}>
                    <Box
                        ref={avatarBoxRef}
                        tabIndex={-1}
                        sx={{ display: 'flex', gap: 1, cursor: 'pointer' }}
                        onClick={handleMenuOpen}
                    >
                        <Avatar alt="Avatar" src={avatarSelect} />
                        {showData && (
                            <>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                    {(config?.client || '')}{' | '}
                                </Typography>
                                <Typography variant="h6">
                                    {(config?.login?.user || '')}
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
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 }}>
                    {showData && (
                        <>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {(config?.locationDevice || '')} {' | '}
                            </Typography>
                            <Typography variant="h6">
                                {(config?.pointDevice || '')}
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
                        <Logout />
                        Cerrar sesión
                    </MenuItem>
                )}
                {showAdmin && (<MenuItem onClick={openAdmin}>
                    <SupervisorAccount />
                    Administración
                </MenuItem>)}
                <MenuItem onClick={openKeyBoard}>
                    <Keyboard />
                    Teclado
                </MenuItem>
                <MenuItem onClick={openConfirmClose}>
                    <CancelPresentation />
                    Salir
                </MenuItem>
            </Menu>
        </AppBar>
    );
}
