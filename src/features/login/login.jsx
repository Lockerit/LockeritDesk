import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/userContext.jsx';
import SnackBarAlert from '../bar/snackAlert.jsx';
import logo from '../../assets/Logo.png';
import { useElectronConfig } from '../hooks/useConfig.js';
import { useWindowSize } from "../hooks/useWindowSize.js";
import { scaledWidth } from '../utils/scaledWidth';
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
    const { width, height, factor } = useWindowSize();
    const scale = factor || 1; // de tu hook useElectronScreenData()

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
            log('info', 'Usuario autenticado en sesión principal, redirigiendo a /ppal');
            navigate('/ppal', { replace: true });
        } else if (userInit?.adminWindowInto && !userInit?.closeSession && !userInit?.closeWindow) {
            log('info', 'Usuario autenticado en sesión administrativa, redirigiendo a /adminlockers');
            navigate('/adminlockers', { replace: true });
        }

    }, [config, userInit, navigate]);

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
            if (userInit?.authenticated) {
                navigate('/ppal', { replace: true });
            } else if (userInit?.adminWindowInto) {
                navigate('/adminlockers', { replace: true });
            }
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
            <Box
                sx={{
                    height: "100%",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                }}
            >
                <Paper
                    elevation={24}
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        // height: "95%",
                        width: scaledWidth(
                            {
                                xs: { base: 90, min: 85, max: 95 }, // en % para mobile
                                sm: { base: 80, min: 70, max: 85 }, // tablet
                                md: { base: 60, min: 55, max: 70 }, // desktop medio
                                lg: { base: 45, min: 40, max: 50 }, // desktop grande
                            },
                            scale
                        ),
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        alignItems: "center",
                        p: 5 * scale,
                        boxSizing: "border-box",
                    }}
                >
                    {/* Logo */}
                    <Box
                        sx={{
                            flex: `0 0 ${12 * scale}%`, // dinámico con scale
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                        }}
                    >
                        <img src={logo} alt="Título" style={{ maxHeight: 150 * scale }} />
                    </Box>

                    {/* Título */}
                    <Box
                        sx={{
                            flex: `0 0 ${10 * scale}%`,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column",
                            width: "100%",
                        }}
                    >
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: "bold",
                                fontSize: `${2 * scale}rem`,
                            }}
                        >
                            {(userInit?.adminWindowInto || userInit?.adminWindow)
                                ? "Administración"
                                : "Aplicación"}
                        </Typography>
                    </Box>

                    {/* Inputs */}
                    <Box
                        sx={{
                            flex: 1,
                            width: "90%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 3 * scale, // separación dinámica
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "flex-end" }}>
                            <Person sx={{ color: "action.active", mr: 2 * scale, fontSize: 40 * scale }} />
                            <TextField
                                variant="standard"
                                fullWidth
                                label="Usuario"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                onFocus={() => window.electronAPI?.openKeyboard()}
                                error={errorsEmpty.username}
                                helperText={errorsEmpty.username ? msgUser : ""}
                            />
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "flex-end" }}>
                            <LockOpen sx={{ color: "action.active", mr: 2 * scale, fontSize: 40 * scale }} />
                            <TextField
                                variant="standard"
                                fullWidth
                                label="Contraseña"
                                type={showPassword ? "text" : "password"}
                                value={pass}
                                onChange={(e) => setPass(e.target.value)}
                                onFocus={() => window.electronAPI?.openKeyboard()}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleTogglePassword} edge="end">
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                                error={errorsEmpty.password}
                                helperText={errorsEmpty.password ? msgPass : ""}
                            />
                        </Box>
                    </Box>

                    {/* Opciones y botones */}
                    <Box
                        sx={{
                            flex: `0 0 ${30 * scale}%`,
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 2 * scale,
                            mt: 5 * scale,
                        }}
                    >
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    color="primary"
                                    sx={{ transform: `scale(${scale})` }} // checkbox escalado
                                />
                            }
                            label={<Typography fontSize={20 * scale}>Recordar usuario</Typography>}
                        />

                        <Button variant="contained" color="success" type="submit" fullWidth>
                            {buttonName}
                            <Send sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
                        </Button>

                        {(userInit?.closeSession || userInit?.closeWindow || userInit?.adminWindow) && (
                            <Button variant="contained" color="secondary" onClick={backPage} fullWidth>
                                Atrás
                                <Undo sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
                            </Button>
                        )}
                    </Box>
                </Paper>
            </Box>

            <SnackBarAlert
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
            />
        </>
    );
}
