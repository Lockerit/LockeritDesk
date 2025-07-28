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

const fileName = 'appbar';

export default function DenseAppBar() {

    const { userInit, setUserInit } = useUser();
    const [closeSession, setCloseSession] = useState(false);
    const [showData, setShowData] = useState(false);
    const [avatarSelect, setAvatarSelect] = useState(avatarImg);
    const [anchorEl, setAnchorEl] = useState(null);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const config = useElectronConfig();
    const avatarBoxRef = useRef(null);
    const navigate = useNavigate();



    useEffect(() => {
        if (!userInit || !config) return;

        const { authenticated, closeSession, closeWindow } = userInit;

        if (authenticated) {
            setShowData(true);
            const avatarPath = config?.login?.avatarPath ?? '';
            const validAvatar = getValidAvatar(avatarPath);
            setAvatarSelect(validAvatar);
        } else {
            setShowData(false);
            setAvatarSelect(avatarImg);
            if (closeSession) setCloseSession(false);
        }
    }, [config, userInit]);


    function getValidAvatar(avatar) {
        if (
            typeof avatar === 'string' &&
            avatar.trim() !== '' &&
            (avatar.startsWith('http') || avatar.startsWith('data:') || avatar.endsWith('.jpg') || avatar.endsWith('.png'))
        ) {
            return avatar;
        }
        return avatarImg;
    }

    const handleMenuOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {

        const updatedUser = { ...userInit, closeWindow: false };
        setUserInit(updatedUser);
        localStorage.setItem('userInit', JSON.stringify(updatedUser));
        setAnchorEl(null);

        // Espera un poco para asegurar que el menú se cierre antes de aplicar foco
        setTimeout(() => {
            avatarBoxRef.current?.focus?.();
        }, 100);
    };

    const handleLogout = () => {
        setCloseSession(true);
        handleMenuClose();

        const updatedUser = { ...userInit, closeSession: true };
        setUserInit(updatedUser);
        localStorage.setItem('userInit', JSON.stringify(updatedUser));
        navigate('/', { replace: true });
    };

    const accpetConfirmation = () => {
        setConfirmDialogOpen(false);
        closeWindows();
    };

    const cancelConfirmation = () => {
        setConfirmDialogOpen(false);
    };

    const openConfirmClose = () => {
        // setConfirmDialogOpen(true);
        const updatedUser = { ...userInit, closeWindow: true };
        setUserInit(updatedUser);
        localStorage.setItem('userInit', JSON.stringify(updatedUser));
        setAnchorEl(null);
        navigate('/', { replace: true });
    };

    return (
        <AppBar position="fixed" elevation={0}>
            <Toolbar>

                {/* Nombre del usuario a la izquierda */}
                <Box sx={{ flex: 1 }}>
                    <Box
                        ref={avatarBoxRef}
                        tabIndex={-1}
                        sx={{
                            display: 'flex',
                            gap: 1,
                            cursor: 'pointer',
                        }}
                        onClick={handleMenuOpen}
                    >
                        <Avatar alt="Avatar" src={avatarSelect} />
                        {showData && (
                            <Typography variant="h6">
                                {(userInit?.user || '')}
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Reloj al centro */}
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                    <Clock />
                </Box>

                {/* Ubicación o texto adicional a la derecha */}
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        gap: 1,
                    }}
                >
                    {showData && (
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                            SAC -
                        </Typography>
                    )}
                    {showData && (
                        <Typography variant="h6">
                            {(config?.locationDevice || '')}
                        </Typography>
                    )}
                </Box>
            </Toolbar>

            {/* Menú desplegable */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}
                disableAutoFocusItem
            >
                {showData && (
                    <MenuItem onClick={handleLogout}>Cerrar sesión</MenuItem>
                )}
                {<MenuItem onClick={openConfirmClose}>Salir</MenuItem>}
            </Menu>

            {/* <ConfirmDialog
                open={confirmDialogOpen}
                onConfirm={accpetConfirmation}
                onCancel={cancelConfirmation}
                tittle={'Confirmar'}
                mesg={'¿Deseas salir?'}
                phone={''}
                isPhone={false}
            /> */}
        </AppBar>
    );
}
