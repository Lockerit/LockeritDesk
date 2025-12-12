import {
    Visibility,
    VisibilityOff,
    Send,
    Person,
    LockOpen,
    Undo,
} from '@mui/icons-material';
import {
    Box,
    Button,
    Typography,
    Paper,
    InputAdornment,
    IconButton,
    FormControlLabel,
    Checkbox,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import logo from '@assets/Logo.png';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { TextFieldVirtKeyPad } from '@shared/components/inputs/TextFieldVirtKeyPad.jsx';
import { useUser } from '@shared/context/UserContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { logger } from '@shared/utils/logger.js';

const USER_STORAGE_KEY = 'userInit';
const fileName = 'Login';
const log = logger.scope(fileName);

export const Login = () => {
    const { userInit, setUserInit } = useUser();
    const [userName, setUserName] = useState('');
    const [pass, setPass] = useState('');
    const [remember, setRemember] = useState(false);
    const [screenLogin, setScreenLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [errorsEmpty, setErrorsEmpty] = useState({
        username: false,
        password: false,
    });
    const msgErrorLogin = 'Usuario o contraseña incorrectos';
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    const navigate = useNavigate();
    const config = useElectronConfig();
    const location = useLocation();
    const theme = useTheme();

    const buttonName = useMemo(() => {
        if (
            (!userInit?.authenticatedOpera && !userInit?.authenticatedAdmin) &&
            !userInit?.closeSession &&
            !userInit?.closeWindow
        ) {
            return 'Iniciar Sesión';
        } else if (
            (userInit?.authenticatedOpera || userInit?.authenticatedAdmin) &&
            userInit?.closeSession
        ) {
            return 'Cerrar Sesión';
        } else {
            return 'Cerrar Aplicación';
        }
    }, [
        userInit?.authenticatedOpera,
        userInit?.authenticatedAdmin,
        userInit?.closeSession,
        userInit?.closeWindow,
    ]);

    useEffect(() => {
        log.info('Montando Login');
    }, []);

    // Inicializar usuario desde userInit
    useEffect(() => {
        if (!userInit) return;

        if (userInit?.remember) {
            setUserName(userInit?.user?.toLowerCase() || '');
            setRemember(true);
        }
        log.info(
            `userInit cargado: authOp=${!!userInit?.authenticatedOpera} authAdm=${!!userInit?.authenticatedAdmin
            } remember=${!!userInit?.remember}`
        );
    }, [userInit]);

    // Redirección según sesión
    useEffect(() => {
        if (!userInit) {
            // No hay sesión cargada
            setScreenLogin(true);
            if (location.pathname !== '/') {
                log.info('Redirección → / (no autenticado)');
                navigate('/', { replace: true });
            }
            return;
        }

        const isOp = !!userInit.authenticatedOpera;
        const isAdm = !!userInit.authenticatedAdmin;
        const isAuth = isOp || isAdm;

        // Ocultar/mostrar parte visual de login
        setScreenLogin(!isAuth);

        // Flujo logout / cerrar aplicación: siempre debe quedarse en "/"
        if (userInit.closeSession || userInit.closeWindow) {
            if (location.pathname !== '/') {
                log.info('Redirección → / (flujo logout/exit)');
                navigate('/', { replace: true });
            }
            return;
        }

        // Sesión activa normal → ir a la pantalla correspondiente si estamos en "/"
        if (isAuth) {
            const target = getHomeRoute(userInit);
            if (location.pathname === '/' || location.pathname === '/login') {
                log.info(`Redirección → ${target} (sesión activa)`);
                navigate(target, { replace: true });
            }
            return;
        }

        // Sin sesión y sin flags → garantizar que estamos en "/"
        if (location.pathname !== '/') {
            log.info('Redirección → / (no autenticado, sin flags)');
            navigate('/', { replace: true });
        }
    }, [userInit, location.pathname, navigate]);

    const getHomeRoute = (session) => {
        if (session?.authenticatedAdmin) return '/adminlockers';
        if (session?.authenticatedOpera) return '/ppal';
        return '/login';
    };

    const handleTogglePassword = () => {
        setShowPassword((prev) => !prev);
        log.info(`Toggle mostrar contraseña → ${!showPassword}`);
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

    const validateInitSession = async () => {
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

        if (
            u === config?.login?.userOpera?.toLowerCase()?.trim() &&
            p === config?.login?.passOpera?.trim()
        ) {
            isValid = 1;
        }
        if (
            u === config?.login?.userAdmin?.toLowerCase()?.trim() &&
            p === config?.login?.passAdmin?.trim()
        ) {
            isValid = 2;
        }

        if (!isValid) {
            log.warn('Credenciales inválidas');
        } else {
            log.info(
                `Validación de sesión OK tipo=${isValid === 1 ? 'OPERADOR' : 'ADMIN'}`
            );
        }

        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        log.info('Submit login/logout/exit disparado');

        const successSession = await validateInitSession();
        if (!successSession) {
            log.warn('Intento de autenticación fallido');
            return showAlert(msgErrorLogin, 'error');
        }

        let newSession = null;
        const isAuth = !!userInit?.authenticatedOpera || !!userInit?.authenticatedAdmin;

        // LOGIN
        if (
            !isAuth &&
            !userInit?.closeSession &&
            !userInit?.closeWindow
        ) {
            newSession = {
                authenticatedOpera: successSession === 1,
                authenticatedAdmin: successSession === 2,
                customer: config?.customer,
                user: remember ? userName?.toLowerCase() || '' : '',
                remember,
                pointName: config?.pointName,
                pointId: config?.pointId,
                avatar: config?.login?.avatarPath,
                closeSession: false,
                closeWindow: false,
            };

            setUserInit(newSession);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newSession));
            log.info(
                `Login exitoso como ${successSession === 1 ? 'OPERADOR' : 'ADMIN'}`
            );

            const route = getHomeRoute(newSession);
            navigate(route, { replace: true });
            return;
        }

        // LOGOUT (Cerrar sesión)
        if (isAuth && userInit?.closeSession) {
            const isCloseAllowed =
                (successSession === 1 && userInit?.authenticatedOpera) ||
                (successSession === 2 && userInit?.authenticatedAdmin);

            if (!isCloseAllowed) {
                log.warn('Intento de cierre de sesión no autorizado');
                return showAlert(
                    `No se pudo cerrar sesión, usuario: ${userInit?.user || ''}`,
                    'error'
                );
            }

            const userAux = remember ? userName?.toLowerCase() || '' : '';
            newSession = {
                authenticatedOpera: false,
                authenticatedAdmin: false,
                customer: '',
                user: userAux,
                remember,
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

            if (location.pathname !== '/') {
                navigate('/', { replace: true });
            }
            return;
        }

        // EXIT (Cerrar aplicación)
        if (userInit?.closeWindow) {
            let canClose = false;

            if (!isAuth) {
                // Sin sesión: cualquier usuario válido puede cerrar (operador o admin)
                canClose = successSession === 1 || successSession === 2;
            } else {
                // Con sesión: solo el usuario actualmente autenticado puede cerrar
                canClose =
                    (successSession === 1 && userInit?.authenticatedOpera) ||
                    (successSession === 2 && userInit?.authenticatedAdmin);
            }

            if (!canClose) {
                log.warn('Intento de cierre de aplicación no autorizado');
                showAlert(
                    'No se pudo cerrar la aplicación con estas credenciales.',
                    'error'
                );
                return;
            }

            const updatedUser = { ...userInit, closeWindow: false };
            setUserInit(updatedUser);
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updatedUser));

            log.info('Cierre de aplicación solicitado (flujo Exit)');
            setTimeout(() => closeWindows(), 500);
            return;
        }
    };

    const backPage = () => {
        const updatedUser = {
            ...userInit,
            closeSession: false,
            closeWindow: false,
        };
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
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
            >
                <Paper
                    elevation={24}
                    component="form"
                    onSubmit={handleSubmit}
                    sx={{
                        minHeight: '40%',
                        width: { xs: '90%', sm: '80%', md: '60%', lg: '45%' },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: { xs: 3, sm: 4, md: 5 },
                        boxSizing: 'border-box',
                    }}
                >
                    {/* Logo */}
                    <Box
                        sx={{
                            flex: '0 0 12%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            width: '100%',
                        }}
                    >
                        <img
                            src={logo}
                            alt="Título"
                            style={{
                                maxHeight: theme.spacing(18),
                                objectFit: 'contain',
                            }}
                        />
                    </Box>

                    {/* Reserva de espacio para título (si necesitas agregarlo después) */}
                    <Box
                        sx={{
                            flex: '0 0 10%',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexDirection: 'column',
                            width: '100%',
                        }}
                    />

                    {/* Inputs */}
                    <Box
                        sx={{
                            flex: 1,
                            width: '90%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 2,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                my: 2,
                            }}
                        >
                            <Person
                                sx={{
                                    color: 'action.active',
                                    mr: 2,
                                    fontSize: theme.spacing(5),
                                }}
                            />
                            <TextFieldVirtKeyPad
                                label="Usuario"
                                value={userName}
                                setValue={setUserName}
                                error={errorsEmpty.username}
                                helperText={
                                    errorsEmpty.username ? 'Ingresa el usuario' : ''
                                }
                                inputProps={{ maxLength: 20 }}
                            />
                        </Box>

                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-end',
                                my: 2,
                            }}
                        >
                            <LockOpen
                                sx={{
                                    color: 'action.active',
                                    mr: 2,
                                    fontSize: theme.spacing(5),
                                }}
                            />
                            <TextFieldVirtKeyPad
                                label="Contraseña"
                                value={pass}
                                setValue={setPass}
                                type={showPassword ? 'text' : 'password'}
                                error={errorsEmpty.password}
                                helperText={
                                    errorsEmpty.password ? 'Ingresa la contraseña' : ''
                                }
                                inputProps={{ maxLength: 10 }}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                onClick={handleTogglePassword}
                                                edge="end"
                                                sx={{
                                                    '& .MuiSvgIcon-root': {
                                                        fontSize: theme.spacing(4),
                                                    },
                                                }}
                                            >
                                                {showPassword ? (
                                                    <VisibilityOff />
                                                ) : (
                                                    <Visibility />
                                                )}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Box>
                    </Box>

                    {/* Opciones y botones */}
                    <Box
                        sx={{
                            flex: '0 0 30%',
                            width: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            gap: 2,
                            mt: 5,
                        }}
                    >
                        {screenLogin && (
                            <Box
                                sx={{
                                    width: '100%',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}
                            >
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={remember}
                                            onChange={(e) => setRemember(e.target.checked)}
                                            color="primary"
                                            sx={{
                                                '& .MuiSvgIcon-root': {
                                                    fontSize: theme.spacing(4),
                                                },
                                            }}
                                        />
                                    }
                                    sx={{ mb: 2 }}
                                    label={<Typography variant="h5">Recordar usuario</Typography>}
                                />
                            </Box>
                        )}

                        <Button variant="contained" color="primary" type="submit" fullWidth>
                            {buttonName}
                            <Send
                                sx={{ fontSize: theme.spacing(5), ml: 2 }}
                            />
                        </Button>

                        {(userInit?.closeSession || userInit?.closeWindow) && (
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={backPage}
                                fullWidth
                            >
                                Atrás
                                <Undo
                                    sx={{ fontSize: theme.spacing(5), ml: 2 }}
                                />
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
