import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/userContext.jsx';
import SnackBarAlert from '../bar/snackAlert.jsx';
import logo from '../../assets/Logo.png';
import { useElectronConfig } from '../hooks/useConfig.js';
import {
    Box,
    Button,
    TextField,
    Typography,
    Paper,
    InputAdornment,
    IconButton,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Send,
    Person,
    LockOpen,
    Undo
} from '@mui/icons-material';

const USER_STORAGE_KEY = 'userInit';
const fileName = 'login';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export default function Login() {
    const { userInit, setUserInit } = useUser();
    const [userName, setUserName] = useState('');
    const [pass, setPass] = useState('');
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errorsEmpty, setErrorsEmpty] = useState({
        username: false,
        password: false,
    });
    const [msgUser, setMsgUser] = useState('Ingresa el usuario.');
    const [msgPass, setMsgPass] = useState('Ingresa la contraseña.');
    const [msgErrorLogin, setMsgErrorLogin] = useState('Usuario o contraseña incorrectos.');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [buttonName, setButtonName] = useState('Iniciar Sesión');

    const navigate = useNavigate();
    const config = useElectronConfig();

    useEffect(() => {
        if (!userInit) return;

        if (userInit?.remember) {
            setUserName(userInit?.user.toLowerCase());
            setRemember(true);
        }

        nameButton();

        if (userInit?.authenticated && !userInit?.closeSession && !userInit?.closeWindow) {

            if (userInit?.adminWindowInto) {
                log('info', 'Usuario autenticado en sesión administrativa, redirigiendo a /adminlockers');
                navigate('/adminlockers', { replace: true });
            } else {
                log('info', 'Usuario autenticado en sesión principal, redirigiendo a /ppal');
                navigate('/ppal', { replace: true });
            }
        }
    }, [close, config, userInit, navigate]);

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    const closeWindows = async () => {
        try {
            if (window?.electronAPI?.exitApp) {
                window.electronAPI.exitApp();
            } else {
                const msg = 'Canal IPC "exitApp" no disponible';
                log('warn', `${msg}`);
                console.warn(msg);
            }
        } catch (err) {
            log('error', `Error al cerrar la app: ${err.message}`);
            console.error('Error al intentar cerrar la app:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const successSession = await validateInitSession(e);
        if (!successSession) {
            log('warn', `Intento de inicio de sesión fallido para usuario: ${userName}`);
            return showAlert(msgErrorLogin, 'error');
        }

        let newSession = null;

        if (!userInit?.authenticated && !userInit?.closeSession && !userInit?.closeWindow && !userInit?.adminWindow && !userInit?.adminWindowInto) {
            // Login
            newSession = {
                authenticated: true,
                client: config.client,
                user: remember ? userName.toLowerCase() : '',
                remember,
                locationDevice: config.locationDevice,
                pointDevice: config.pointDevice,
                avatar: config.login.avatarPath,
                closeSession: false,
                closeWindow: false,
                adminWindow: false
            };
            setUserInit(newSession);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newSession));
            log('info', `Inicio de sesión exitoso para usuario: ${newSession.user}`);
            navigate('/ppal', { replace: true });
        } else if ((userInit?.authenticated || userInit?.adminWindowInto) && userInit?.closeSession && !userInit?.closeWindow && !userInit?.adminWindow) {
            const userAux = remember ? userName.toLowerCase() : '';

            // Logout
            newSession = {
                authenticated: false,
                client: '',
                user: userAux,
                remember,
                locationDevice: '',
                pointDevice: '',
                avatar: '',
                closeSession: false,
                closeWindow: false,
                adminWindow: false,
                adminWindowInto: false
            };
            setUserInit(newSession);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newSession));
            setUserName(userAux);
            setPass('');
            showAlert('Sesión cerrada exitosamente.', 'success');
            log('info', `Cierre de sesión para usuario: ${userAux}`);
        } else if (!userInit?.closeSession && !userInit?.closeWindow && userInit?.adminWindow && !userInit?.adminWindowInto) {
            const userAux = remember ? userName.toLowerCase() : '';
            log('info', `Ir a la ventana de administración: ${userAux}`);
            const updatedUser = { ...userInit, adminWindow: false, adminWindowInto: true };
            setUserInit(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
            navigate('/adminlockers', { replace: true });
        } else if (userInit?.closeWindow) {
            const userAux = remember ? userName.toLowerCase() : '';
            log('info', `Cierre de la aplicación para usuario: ${userAux}`);
            const updatedUser = { ...userInit, closeWindow: false };
            setUserInit(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
            navigate('/ppal', { replace: true });
            setTimeout(() => {
                closeWindows();
            }, 500);
        }
    };

    const validateInitSession = async (e) => {
        e.preventDefault();

        const usernameError = userName.trim() === '';
        const passwordError = pass.trim() === '';

        setErrorsEmpty({ username: usernameError, password: passwordError });

        if (usernameError || passwordError) {
            const errores = [];
            if (usernameError) errores.push(msgUser);
            if (passwordError) errores.push('El Usuario es obligatorio');

            const msg = errores.join(' | ');
            log('warn', `Errores de validación: ${msg}`);
            showAlert(msg, 'error');
            return false;
        }

        if (!config || !config.login) {
            log('error', 'No se encontró la configuración de login.');
            showAlert('Configuración de login no disponible.', 'error');
            return false;
        }

        const isValid = userName.toLowerCase() === config?.login?.user.toLowerCase() && pass === config.login.pass;

        if (!isValid) {
            log('warn', `Credenciales inválidas: usuario=${userName}`);
        }

        return isValid;
    };

    const backPage = () => {
        const updatedUser = { ...userInit, closeSession: false, closeWindow: false, adminWindow: false };
        setUserInit(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

        if (userInit?.adminWindowInto) {
            navigate('/adminlockers', { replace: true });
            log('info', 'Redirigiendo a /adminlokers desde Login');
        } else {
            navigate('/ppal', { replace: true });
            log('info', 'Redirigiendo a /ppal desde Login');
        }
    };

    const showAlert = (msg, severity = 'error') => {
        setSnackbarMessage(msg);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const nameButton = () => {

        if (!userInit?.authenticated && !userInit?.closeSession && !userInit?.closeWindow && !userInit?.adminWindow && !userInit?.adminWindowInto) {
            setButtonName('Iniciar Sesión');
        } else if ((userInit?.authenticated || userInit?.adminWindowInto) && userInit?.closeSession && !userInit?.closeWindow && !userInit?.adminWindow) {
            setButtonName('Cerrar Sesión');
        } else if (!userInit?.closeSession && !userInit?.closeWindow && userInit?.adminWindow && !userInit?.adminWindowInto) {
            setButtonName('Iniciar Sesión');
        } else if (userInit?.closeWindow) {
            setButtonName('Salir');
        }
    }

    return (
        <>
            <Box sx={{
                maxHeight: 'calc(90vh - 64px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: '100%',
                alignItems: 'center'
            }}>
                <Paper elevation={24}
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        p: 5,
                        width: {
                            xs: '90%',
                            sm: '70%',
                            md: '50%',
                            lg: '40%'
                        },
                        maxHeight: '80%',
                        mx: 'auto',
                        mt: 10
                    }}>
                    <Box sx={{
                        height: '10%',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%',
                        mb: 2,
                    }}>
                        <img src={logo} alt="Título" style={{ maxHeight: 150 }} />
                    </Box>

                    <Box textAlign="center" sx={{ display: 'flex', alignItems: 'center', flexDirection: 'column', height: '10%' }}>
                        <Typography variant="h4"
                            sx={{ fontWeight: 'bold', mb: 2 }}
                        >
                            {(userInit?.adminWindowInto || userInit?.adminWindow ) ? 'Administración': 'Aplicación'}
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Person sx={{ color: 'action.active', mr: 2, my: 1, fontSize: 40 }} />
                        <TextField variant='standard'
                            fullWidth
                            label="Usuario"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            onFocus={() => window.electronAPI?.openKeyboard()}
                            margin="normal"
                            error={errorsEmpty.username}
                            helperText={errorsEmpty.username ? msgUser : ''}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                        <LockOpen sx={{ color: 'action.active', mr: 2, my: 1.5, fontSize: 40 }} />
                        <TextField variant='standard'
                            fullWidth
                            label="Contraseña"
                            type={showPassword ? 'text' : 'password'}
                            onFocus={() => window.electronAPI?.openKeyboard()}
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={handleTogglePassword}
                                            edge="end"
                                            aria-label="toggle password visibility"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            value={pass}
                            onChange={(e) => setPass(e.target.value)}
                            margin="normal"
                            error={errorsEmpty.password}
                            helperText={errorsEmpty.password ? msgPass : ''}
                        />
                    </Box>

                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Typography fontSize={20}>Recordar usuario</Typography>
                        }
                        sx={{ mt: 5 }}
                    />

                    <Button variant="contained" color="success" type='submit' fullWidth sx={{ my: 1 }}>
                        {buttonName}
                        <Send sx={{ fontSize: 40, ml: 3 }} />
                    </Button>

                    {(userInit?.closeSession || userInit?.closeWindow || userInit?.adminWindow) && (
                        <Button variant="contained" color="secondary" type='button' onClick={backPage} fullWidth sx={{ my: 1 }}>
                            Atrás
                            <Undo sx={{ fontSize: 40, ml: 3 }} />
                        </Button>
                    )}

                    <SnackBarAlert
                        open={snackbarOpen}
                        message={snackbarMessage}
                        severity={snackbarSeverity}
                        onClose={() => setSnackbarOpen(false)}
                    />
                </Paper>
            </Box>
        </>
    );
}
