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

const fileName = 'login';

// Logging centralizado
function log(level, message) {
    const msg = `[${fileName}] ${message}`;
    if (window?.electronAPI?.sendLog) {
        window.electronAPI.sendLog(level, msg);
    } else {
        console[level] ? console[level](msg) : console.log(msg);
    }
}

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
            log('info', 'Usuario ya autenticado, redirigiendo a /ppal');
            navigate('/ppal', { replace: true });
        }
    }, [close, config, userInit, navigate]);

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    const closeWindows = () => {
        try {
            if (window?.electronAPI?.exitApp) {
                window.electronAPI.exitApp();
            } else {
                const msg = 'Canal IPC "exitApp" no disponible';
                window?.electronAPI?.log?.('warn', `[${fileName}] ${msg}`);
                console.warn(msg);
            }
        } catch (err) {
            window?.electronAPI?.log?.('error', `[${filename}] Error al cerrar la app: ${err.message}`);
            console.error('Error al intentar cerrar la app:', err);
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault();

        const successSession = await validateInitSession(e);
        if (!successSession) {
            log('warn', `Intento de inicio de sesión fallido para usuario: ${userName}`);
            return showAlert(msgErrorLogin, 'error');
        }

        let newSession = null;

        if (!userInit?.authenticated) {
            // Login
            newSession = {
                authenticated: true,
                user: remember ? userName.toLowerCase() : '',
                remember,
                locationDevice: config.locationDevice,
                avatar: config.login.avatarPath,
                closeSession: false,
                closeWindow: false
            };
            setUserInit(newSession);
            localStorage.setItem('userInit', JSON.stringify(newSession));
            log('info', `Inicio de sesión exitoso para usuario: ${newSession.user}`);
            navigate('/ppal', { replace: true });
        } else if (userInit?.authenticated && userInit?.closeSession) {
            const userAux = remember ? userName.toLowerCase() : '';

            // Logout
            newSession = {
                authenticated: false,
                user: userAux,
                remember,
                locationDevice: '',
                avatar: '',
                closeSession: false,
                closeWindow: false
            };
            setUserInit(newSession);
            localStorage.setItem('userInit', JSON.stringify(newSession));
            setUserName(userAux);
            setPass('');
            showAlert('Sesión cerrada exitosamente.', 'success');
            log('info', `Cierre de sesión para usuario: ${userAux}`);
        } else if (userInit?.authenticated && userInit?.closeWindow) {
            const userAux = remember ? userName.toLowerCase() : '';
            log('info', `Cierre de la aplicación para usuario: ${userAux}`);
            const updatedUser = { ...userInit, closeWindow: false };
            setUserInit(updatedUser);
            localStorage.setItem('userInit', JSON.stringify(updatedUser));
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
        const updatedUser = { ...userInit, closeSession: false, closeWindow: false };
        setUserInit(updatedUser);
        localStorage.setItem('userInit', JSON.stringify(updatedUser));
        navigate('/ppal', { replace: true });
        log('info', 'Redirigiendo a /ppal desde Login');
    };

    const showAlert = (msg, severity = 'error') => {
        setSnackbarMessage(msg);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const nameButton = () => {

        if (!userInit?.authenticated) {

            if (userInit?.closeWindow) {
                setButtonName('Salir');
            } else {
                setButtonName('Iniciar Sesión');
            }
        } else if (userInit?.authenticated) {
            if (userInit?.closeSession) {
                setButtonName('Cerrar Sesión');
            } else if (userInit?.closeWindow) {
                setButtonName('Salir');
            }
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

                    <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                        <Person sx={{ color: 'action.active', mr: 2, my: 1, fontSize: 40 }} />
                        <TextField variant='standard'
                            fullWidth
                            label="Usuario"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
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

                    {(userInit?.closeSession || userInit?.closeWindow) && (
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
