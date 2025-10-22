import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '@shared/context/UserContext.jsx';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import logo from '@assets/Logo.png';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { TextFieldVirtKeyPad } from '@shared/components/inputs/textFieldVirtKeyPad.jsx';
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
const fileName = 'Login';

// Logging centralizado
const log = (level, message) => {
    if (typeof window !== 'undefined' && window.electronAPI?.log) {
        window.electronAPI.log(level, `[${fileName}] ${message}`);
    }
};

export const Login = () => {
    const { userInit, setUserInit } = useUser();
    const [userName, setUserName] = useState('');
    const [pass, setPass] = useState('');
    const [remember, setRemember] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);
    const [screenLogin, setScreenLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [errorsEmpty, setErrorsEmpty] = useState({
        username: false,
        password: false,
    });
    const [msgErrorLogin, setMsgErrorLogin] = useState('Usuario o contraseña incorrectos');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const [buttonName, setButtonName] = useState('Iniciar Sesión');
    const size = useWindowSizeContext();
    const scale = size.factor || 1; // de tu hook useElectronScreenData()
    const keyboardContainerRef = useRef();
    const [showKeyboard] = useState(false);

    const navigate = useNavigate();
    const config = useElectronConfig();
    const location = useLocation();
    const redirected = useRef(false);

    // Solo inicializar usuario
    useEffect(() => {
        if (!userInit) return;

        if (userInit?.remember) {
            setUserName(userInit?.user.toLowerCase());
            setRemember(true);
        }

        if (userInit?.fullScreen) {
            setFullScreen(true);
        }

        nameButton();
    }, [userInit]);

    // Solo redirección
    useEffect(() => {
        if (!userInit || redirected.current) return;

        if (userInit?.authenticatedOpera || userInit?.authenticatedAdmin) {
            setScreenLogin(false);
        }
        else {
            setScreenLogin(true);
        }

        if (userInit?.authenticatedOpera && !userInit?.closeSession && !userInit?.closeWindow) {
            if (location.pathname !== "/ppal") {
                redirected.current = true;
                log('info', 'Usuario autenticado en sesión principal, redirigiendo a /ppal');
                navigate("/ppal", { replace: true });
            }
        } else if (userInit?.authenticatedAdmin && !userInit?.closeSession && !userInit?.closeWindow) {
            if (location.pathname !== "/adminlockers") {
                redirected.current = true;
                log('info', 'Usuario autenticado en sesión principal, redirigiendo a /adminlockers');
                navigate("/adminlockers", { replace: true });
            }
        }
    }, [userInit, location, navigate]);

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
    };

    const handleChangeFullScreen = () => {
        window.electronAPI.setFullScreen(fullScreen);
        window.electronAPI.setFrame(!fullScreen);
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

        if (!userInit?.authenticatedOpera && !userInit?.authenticatedAdmin && !userInit?.closeSession && !userInit?.closeWindow) {

            // Login
            newSession = {
                authenticatedOpera: successSession === 1 ? true : false,
                authenticatedAdmin: successSession === 2 ? true : false,
                customer: config.customer,
                user: remember ? userName.toLowerCase() : '',
                remember,
                fullScreen,
                pointName: config.pointName,
                pointId: config.pointId,
                avatar: config.login.avatarPath,
                closeSession: false,
                closeWindow: false,
            };
            setUserInit(newSession);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newSession));
            log('info', `Inicio de sesión exitoso para usuario: ${newSession.user}`);

            if (successSession === 1) {
                navigate('/ppal', { replace: true });
            }

            if (successSession === 2) {
                navigate('/adminlockers', { replace: true });
            }
            handleChangeFullScreen();
        } else if ((userInit?.authenticatedOpera || userInit?.authenticatedAdmin) && userInit?.closeSession) {

            let isCloseAllowed = true;

            isCloseAllowed = successSession === 1 && userInit?.authenticatedOpera ? true : successSession === 2 && userInit?.authenticatedAdmin ? true : false;

            if (!isCloseAllowed) {
                log('warn', `Intento de cierre de sesión fallido para usuario: ${userName}`);
                return showAlert(`No se pudo cerrar sesión, usuario: ${userInit?.user}`, 'error');
            }

            const userAux = remember ? userName.toLowerCase() : '';

            // Logout
            newSession = {
                authenticatedOpera: false,
                authenticatedAdmin: false,
                customer: '',
                user: userAux,
                remember,
                fullScreen,
                pointName: '',
                pointId: '',
                avatar: '',
                closeSession: false,
                closeWindow: false,
            };
            setUserInit(newSession);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newSession));
            setUserName(userAux);
            setPass('');
            showAlert('Sesión cerrada exitosamente.', 'success');
            log('info', `Cierre de sesión para usuario: ${userAux}`);
        } else if (userInit?.closeWindow) {
            const userAux = remember ? userName.toLowerCase() : '';
            log('info', `Cierre de la aplicación para usuario: ${userAux}`);
            const updatedUser = { ...userInit, closeWindow: false };
            setUserInit(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
            if (userInit?.authenticatedOpera) {
                navigate('/ppal', { replace: true });
            } else if (userInit?.authenticatedAdmin) {
                navigate('/adminlockers', { replace: true });
            }
            setTimeout(() => {
                closeWindows();
            }, 500);
        }
    };

    const validateInitSession = async (e) => {
        e.preventDefault();

        let isValid = 0;

        const usernameError = userName.trim() === '';
        const passwordError = pass.trim() === '';

        setErrorsEmpty({ username: usernameError, password: passwordError });

        if (usernameError || passwordError) {
            const errores = [];
            if (usernameError) errores.push("El Usuario es obligatorio");
            if (passwordError) errores.push('La contraseña es obligatoria');

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

        if (userName.toLowerCase() === config?.login?.userOpera.toLowerCase() && pass === config?.login?.passOpera) {
            isValid = 1;
        }

        if (userName.toLowerCase() === config?.login?.userAdmin.toLowerCase() && pass === config?.login?.passAdmin) {
            isValid = 2;
        }

        if (!isValid) {
            log('warn', `Credenciales inválidas: usuario=${userName}`);
        }

        return isValid;
    };

    const backPage = () => {
        const updatedUser = { ...userInit, closeSession: false, closeWindow: false };
        setUserInit(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

        if (userInit?.authenticatedAdmin) {
            navigate('/adminlockers', { replace: true });
            log('info', 'Redirigiendo a /adminlokers desde Login');
        } else if (userInit?.authenticatedOpera) {
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

        if ((!userInit?.authenticatedOpera || !userInit?.authenticatedAdmin) && !userInit?.closeSession && !userInit?.closeWindow) {
            setButtonName('Iniciar Sesión');
        } else if ((userInit?.authenticatedOpera || userInit?.authenticatedAdmin) && userInit?.closeSession) {
            setButtonName('Cerrar Sesión');
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
                        minHeight: "40%",
                        width: scaledDimension(
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
                            flex: `0 0 12%%`, // dinámico con scale
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
                            flex: '0 0 10%',
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column",
                            width: "100%",
                        }}
                    >
                    </Box>

                    {/* Inputs */}
                    <Box
                        sx={{
                            flex: 1,
                            width: "90%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 2 * scale, // separación dinámica
                        }}
                    >
                        <Box sx={{ display: "flex", alignItems: "flex-end", my: 2 * scale }}>
                            <Person sx={{ color: "action.active", mr: 2 * scale, fontSize: 40 * scale }} />
                            <TextFieldVirtKeyPad
                                label="Usuario"
                                value={userName}
                                setValue={setUserName}
                                error={errorsEmpty.username}
                                helperText={errorsEmpty.username ? "Ingresa el usuario" : ""}
                                inputProps={{ maxLength: 20 }}   // 👈 bloquea a 20
                            />
                        </Box>

                        <Box sx={{ display: "flex", alignItems: "flex-end", my: 2 * scale }}>
                            <LockOpen sx={{ color: "action.active", mr: 2 * scale, fontSize: 40 * scale }} />
                            <TextFieldVirtKeyPad
                                label="Contraseña"
                                value={pass}
                                setValue={setPass}
                                type={showPassword ? "text" : "password"}
                                error={errorsEmpty.password}
                                helperText={errorsEmpty.password ? "Ingresa la contraseña" : ""}
                                inputProps={{ maxLength: 10 }}   // 👈 bloquea a 10
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleTogglePassword} edge="end"
                                                sx={{ "& .MuiSvgIcon-root": { fontSize: `${32 * scale}px` } }}>
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Opciones y botones */}
                    <Box
                        sx={{
                            flex: `0 0 30%`,
                            width: "100%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 2 * scale,
                            mt: 5 * scale,
                        }}
                    >

                        {screenLogin && (<Box sx={{
                            width: "100%",
                            display: "flex",
                            flexDirection: "row",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }} >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={remember}
                                        onChange={(e) => setRemember(e.target.checked)}
                                        color="primary"
                                        sx={{
                                            '& .MuiSvgIcon-root': {
                                                fontSize: `${32 * scale}px`, // aquí controlas el tamaño real
                                            },
                                        }} // checkbox escalado
                                    />
                                }
                                sx={{ mb: 2 * scale }}
                                label={<Typography variant='h5'>Recordar usuario</Typography>}
                            />

                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={fullScreen}
                                        onChange={(e) => setFullScreen(e.target.checked)}
                                        color="primary"
                                        sx={{
                                            '& .MuiSvgIcon-root': {
                                                fontSize: `${32 * scale}px`, // aquí controlas el tamaño real
                                            },
                                        }} // checkbox escalado
                                    />
                                }
                                sx={{ mb: 2 * scale }}
                                label={<Typography variant='h5'>Pantalla completa</Typography>}
                            />
                        </Box>
                        )}

                        <Button variant="contained" color="success" type="submit" fullWidth>
                            {buttonName}
                            <Send sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
                        </Button>

                        {(userInit?.closeSession || userInit?.closeWindow) && (
                            <Button variant="contained" color="secondary" onClick={backPage} fullWidth>
                                Atrás
                                <Undo sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
                            </Button>
                        )}
                    </Box>
                </Paper >
            </Box >

            {showKeyboard && (
                <Paper
                    elevation={3}
                    sx={{ position: "absolute", top: "100%", mt: 1, zIndex: 1000, p: 1 }}
                    ref={keyboardContainerRef}
                >
                    <VirtualKeyboard inputValue={userName} onChange={setUserName} />
                </Paper>
            )
            }

            <SnackAlert
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
            />
        </>
    );
}
