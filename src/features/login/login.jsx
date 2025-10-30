import {
    Visibility, VisibilityOff, Send, Person, LockOpen, Undo
} from '@mui/icons-material';
import {
    Box, Button, Typography, Paper, InputAdornment, IconButton, FormControlLabel, Checkbox
} from '@mui/material';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import logo from '@assets/Logo.png';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { TextFieldVirtKeyPad } from '@shared/components/inputs/TextFieldVirtKeyPad.jsx';
import { useUser } from '@shared/context/UserContext.jsx';
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';
import { scaledDimension } from '@shared/utils/scaledDimension.js';

const USER_STORAGE_KEY = 'userInit';
const fileName = 'Login';
const log = logger.scope(fileName);

export const Login = () => {
    const { userInit, setUserInit } = useUser();
    const [userName, setUserName] = useState('');
    const [pass, setPass] = useState('');
    const [remember, setRemember] = useState(false);
    const [fullScreen, setFullScreen] = useState(false);
    const [screenLogin, setScreenLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [errorsEmpty, setErrorsEmpty] = useState({ username: false, password: false });
    const [msgErrorLogin] = useState('Usuario o contraseña incorrectos');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    const size = useWindowSizeContext();
    const scale = size.factor || 1;

    const navigate = useNavigate();
    const config = useElectronConfig();
    const location = useLocation();
    const redirected = useRef(false);

    const buttonName = useMemo(() => {
        if ((!userInit?.authenticatedOpera && !userInit?.authenticatedAdmin) &&
            !userInit?.closeSession && !userInit?.closeWindow) {
            return 'Iniciar Sesión';
        }
        else if ((userInit?.authenticatedOpera || userInit?.authenticatedAdmin) && userInit?.closeSession) {
            return 'Cerrar Sesión';
        }
        else {
            return 'Salir';
        }
    }, [
        userInit?.authenticatedOpera,
        userInit?.authenticatedAdmin,
        userInit?.closeSession,
        userInit?.closeWindow,
    ]);

    // Montaje
    useEffect(() => {
        log.info('Montando Login');
    }, []);

    // Solo inicializar usuario desde userInit
    useEffect(() => {
        if (!userInit) return;

        if (userInit?.remember) {
            setUserName(userInit?.user?.toLowerCase() || '');
            setRemember(true);
        }
        if (userInit?.fullScreen) setFullScreen(true);

        log.info(`userInit cargado: authOp=${!!userInit?.authenticatedOpera} authAdm=${!!userInit?.authenticatedAdmin} remember=${!!userInit?.remember} fullScreen=${!!userInit?.fullScreen}`);
    }, [userInit]);

    // Solo redirección
    useEffect(() => {
        if (!userInit || redirected.current) return;

        const isOp = !!userInit?.authenticatedOpera;
        const isAdm = !!userInit?.authenticatedAdmin;
        setScreenLogin(!(isOp || isAdm));

        if (isOp && !userInit?.closeSession && !userInit?.closeWindow) {
            if (location.pathname !== "/ppal") {
                redirected.current = true;
                log.info('Redirección → /ppal (operador autenticado)');
                navigate("/ppal", { replace: true });
            }
        } else if (isAdm && !userInit?.closeSession && !userInit?.closeWindow) {
            if (location.pathname !== "/adminlockers") {
                redirected.current = true;
                log.info('Redirección → /adminlockers (admin autenticado)');
                navigate("/adminlockers", { replace: true });
            }
        }
    }, [userInit, location, navigate]);

    const handleTogglePassword = () => {
        setShowPassword(prev => !prev);
        log.info(`Toggle mostrar contraseña → ${!showPassword}`);
    };

    const handleChangeFullScreen = () => {
        try {
            window.electronAPI.setFullScreen(fullScreen);
            window.electronAPI.setFrame(!fullScreen);
            log.info(`Aplicado modo pantalla → fullScreen=${fullScreen}`);
        } catch {
            log.warn('No se pudo aplicar modo de pantalla desde IPC');
        }
    };

    const closeWindows = async () => {
        try {
            if (window?.electronAPI?.exitApp) {
                log.info('Solicitando cierre de aplicación');
                window.electronAPI.exitApp();
            } else {
                log.warn('Canal IPC exitApp no disponible');
            }
        } catch (err) {
            log.error(`Error al cerrar la app: ${err?.message || err}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        log.info('Submit login/logout/exit disparado');

        const successSession = await validateInitSession(e);
        if (!successSession) {
            log.warn('Intento de autenticación fallido');
            return showAlert(msgErrorLogin, 'error');
        }

        let newSession = null;

        // LOGIN
        if (!userInit?.authenticatedOpera && !userInit?.authenticatedAdmin && !userInit?.closeSession && !userInit?.closeWindow) {
            newSession = {
                authenticatedOpera: successSession === 1,
                authenticatedAdmin: successSession === 2,
                customer: config?.customer,
                user: remember ? (userName?.toLowerCase() || '') : '',
                remember,
                fullScreen,
                pointName: config?.pointName,
                pointId: config?.pointId,
                avatar: config?.login?.avatarPath,
                closeSession: false,
                closeWindow: false,
            };
            setUserInit(newSession);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newSession));
            log.info(`Login exitoso como ${successSession === 1 ? 'OPERADOR' : 'ADMIN'}`);

            if (successSession === 1) navigate('/ppal', { replace: true });
            if (successSession === 2) navigate('/adminlockers', { replace: true });
            handleChangeFullScreen();
            return;
        }

        // LOGOUT
        if ((userInit?.authenticatedOpera || userInit?.authenticatedAdmin) && userInit?.closeSession) {
            const isCloseAllowed =
                (successSession === 1 && userInit?.authenticatedOpera) ||
                (successSession === 2 && userInit?.authenticatedAdmin);

            if (!isCloseAllowed) {
                log.warn('Intento de cierre de sesión no autorizado');
                return showAlert(`No se pudo cerrar sesión, usuario: ${userInit?.user || ''}`, 'error');
            }

            const userAux = remember ? (userName?.toLowerCase() || '') : '';
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
            log.info('Logout exitoso');
            return;
        }

        // EXIT
        if (userInit?.closeWindow) {
            const updatedUser = { ...userInit, closeWindow: false };
            setUserInit(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));
            if (userInit?.authenticatedOpera) navigate('/ppal', { replace: true });
            else if (userInit?.authenticatedAdmin) navigate('/adminlockers', { replace: true });

            log.info('Cierre de aplicación solicitado (flujo Exit)');
            setTimeout(() => closeWindows(), 500);
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
            if (usernameError) errores.push('El Usuario es obligatorio');
            if (passwordError) errores.push('La contraseña es obligatoria');

            const msg = errores.join(' | ');
            log.warn(`Validación incompleta: ${msg}`);
            showAlert(msg, 'error');
            return false;
        }

        if (!config || !config.login) {
            log.error('Configuración de login no disponible');
            showAlert('Configuración de login no disponible.', 'error');
            return false;
        }

        const u = userName.toLowerCase().trim();
        const p = pass.trim();

        if (u === config?.login?.userOpera?.toLowerCase()?.trim() && p === config?.login?.passOpera?.trim()) {
            isValid = 1;
        }
        if (u === config?.login?.userAdmin?.toLowerCase()?.trim() && p === config?.login?.passAdmin?.trim()) {
            isValid = 2;
        }

        if (!isValid) {
            // No registrar credenciales; solo el resultado
            log.warn('Credenciales inválidas');
        } else {
            log.info(`Validación de sesión OK tipo=${isValid === 1 ? 'OPERADOR' : 'ADMIN'}`);
        }

        return isValid;
    };

    const backPage = () => {
        const updatedUser = { ...userInit, closeSession: false, closeWindow: false };
        setUserInit(updatedUser);
        localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

        if (userInit?.authenticatedAdmin) {
            log.info('Back → /adminlockers');
            navigate('/adminlockers', { replace: true });
        } else if (userInit?.authenticatedOpera) {
            log.info('Back → /ppal');
            navigate('/ppal', { replace: true });
        }
    };

    const showAlert = (msg, severity = 'error') => {
        setSnackbarMessage(msg);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

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
                                xs: { base: 90, min: 85, max: 95 },
                                sm: { base: 80, min: 70, max: 85 },
                                md: { base: 60, min: 55, max: 70 },
                                lg: { base: 45, min: 40, max: 50 },
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
                            flex: `0 0 12%%`,
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            width: "100%",
                        }}
                    >
                        <img src={logo} alt="Título" style={{ maxHeight: 150 * scale }} />
                    </Box>

                    {/* Título (reserva de espacio) */}
                    <Box
                        sx={{
                            flex: '0 0 10%',
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            flexDirection: "column",
                            width: "100%",
                        }}
                    />

                    {/* Inputs */}
                    <Box
                        sx={{
                            flex: 1,
                            width: "90%",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            gap: 2 * scale,
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
                                inputProps={{ maxLength: 20 }}
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
                                inputProps={{ maxLength: 10 }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={handleTogglePassword}
                                                edge="end"
                                                sx={{ "& .MuiSvgIcon-root": { fontSize: `${32 * scale}px` } }}
                                            >
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
                        {screenLogin && (
                            <Box
                                sx={{
                                    width: "100%",
                                    display: "flex",
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                            color="primary"
                                            sx={{ '& .MuiSvgIcon-root': { fontSize: `${32 * scale}px` } }}
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
                                            sx={{ '& .MuiSvgIcon-root': { fontSize: `${32 * scale}px` } }}
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
                </Paper>
            </Box>

            <SnackAlert
                open={snackbarOpen}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setSnackbarOpen(false)}
            />
        </>
    );
};
