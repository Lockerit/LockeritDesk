import {
  Backspace,
  Close,
  DoneAll,
  MobileFriendly,
  Refresh,
  ArrowForwardIos,
  Password,
} from '@mui/icons-material';
import {
  Grid,
  Button,
  TextField,
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Slide,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  useState,
  useRef,
  forwardRef,
  useEffect,
  useCallback,
} from 'react';

import { paymentService } from '@services/apis/assignLocker.js';
import { OpenReserveLocker } from '@services/apis/openReserveLocker.js';
import { OpenSessionLocker } from '@services/apis/openSessionLocker.js';
import { closeWebSocket } from '@services/realtime/websocket.js';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { cancelObservable } from '@shared/utils/cancelObservable.js';
import { logger } from '@shared/utils/logger.js';
import {
  speak,
  stopSpeaking,
} from '@shared/utils/speak.js';
import {
  formatTime,
  PHONE_REGEX,
  keys,
  formatNumberPhone,
  formatCurrency,
} from '@shared/utils/utils.js';

import { ConfirmDialog } from './ConfirmDialog.jsx';
import { InsertMoney } from './InsertMoney.jsx';
import { Loading } from './Loading.jsx';
import { ShowErrorAPI } from './ShowErrorAPI.jsx';
import { ShowLocker } from './ShowLocker.jsx';

const fileName = 'KeypadNumeric';
const log = logger.scope(fileName);

// Utils de privacidad
const maskPhone = (p) => {
  const s = String(p || '').replace(/\D/g, '');
  if (s.length <= 4) return '****';
  return s.slice(0, s.length - 4).replace(/./g, '*') + s.slice(-4);
};

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export const KeypadNumeric = ({
  open,
  onClose,
  operation,
  timeout = 600,
}) => {
  const [activeInput, setActiveInput] = useState('phone');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [errorsEmpty, setErrorsEmpty] = useState({
    phone: false,
    password: false,
    confirmPassword: false,
  });
  const [msgPhone, setMsgPhone] = useState('');
  const [msgPass, setMsgPass] = useState('');
  const [msgConfPass, setMsgConfPass] = useState('');
  const [amountService, setAmountService] = useState('');
  const [messageErrorAPI, setMessageErrorAPI] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(timeout);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState();
  const [timeoutInsert, setTimeoutInsert] = useState();
  const [timeoutShowMessage, setTimeoutShowMessage] = useState();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [amountPay, setAmountPay] = useState(0);
  const [locker, setLocker] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState();
  const [insertMoneyOpen, setInsertMoneyOpen] = useState();
  const [showLockerOpen, setShowLockerOpen] = useState();
  const [showErrorAPIOpen, setShowErrorAPIOpen] = useState();

  const phoneRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);
  const cleanupRef = useRef(null);
  const config = useElectronConfig();
  const theme = useTheme();

  const operationRet = operation === 'Retirar' || operation === 'Reservado';
  const isConfigReady = !!config && Object.keys(config).length > 0;
  const intervalRef = useRef(null);

  const clearInputs = useCallback(() => {
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setActiveInput('phone');
    setErrorsEmpty({
      phone: false,
      password: false,
      confirmPassword: false,
    });
    setConfirmDialogOpen(false);
    setInsertMoneyOpen(false);
    log.debug('Inputs reseteados');
  }, []);

  const cancel = useCallback(() => {
    log.info('Cancelación solicitada');

    try {
      const active = document.activeElement;
      if (active && active instanceof HTMLElement) {
        active.blur();
      }
    } catch {
      // noop
    }

    clearInputs();
    onClose?.();
  }, [clearInputs, onClose]);

  const cancelInsertMoney = useCallback(() => {
    try {
      cleanupRef.current && cleanupRef.current();
    } catch {
      /* noop */
    }
    cancelObservable.setCancel(true);
    setAmountPay(0);
    closeWebSocket();
    setInsertMoneyOpen(false);
    log.info('InsertMoney cancelado');
  }, []);

  useEffect(() => {
    if (!open) {
      try {
        const active = document.activeElement;
        if (active && active instanceof HTMLElement) {
          active.blur();
        }
      } catch {
        // noop
      }
    }
  }, [open]);

  // Montaje / desmontaje
  useEffect(() => {
    log.info(`Montaje | operation=${operation} | timeout=${timeout}`);
    return () => {
      closeWebSocket();
      log.debug('Desmontaje');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cambios de props (solo logs)
  const lastProps = useRef({
    open: undefined,
    operation: undefined,
    timeout: undefined,
  });
  useEffect(() => {
    if (lastProps.current.open !== open) {
      log.debug(`Prop changed: open=${open}`);
      lastProps.current.open = open;
    }
    if (lastProps.current.operation !== operation) {
      log.info(`Prop changed: operation=${operation}`);
      lastProps.current.operation = operation;
    }
    if (lastProps.current.timeout !== timeout) {
      log.info(`Prop changed: timeout=${timeout}`);
      lastProps.current.timeout = timeout;
    }
  }, [open, operation, timeout]);

  // Frena TTS al abrir
  useEffect(() => {
    if (open) {
      stopSpeaking();
      log.debug('TTS detenido por apertura de KeypadNumeric');
    }
  }, [open]);

  // Reinicia contador por apertura o cambio de timeout
  useEffect(() => {
    if (open) {
      setSecondsLeft(timeout);
      log.debug(`Reinicio contador | secondsLeft=${timeout}`);
    }
  }, [open, timeout]);

  // Intervalo countdown
  useEffect(() => {
    if (!open || secondsLeft <= 0) return;
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [open, secondsLeft]);

  // Autocerrar por timeout
  useEffect(() => {
    if (open && secondsLeft === 0) {
      log.warn('Tiempo agotado, cancelando flujo KeypadNumeric');
      setSecondsLeft(timeout);
      cancel();
    }
  }, [open, secondsLeft, cancel, timeout]);

  // Carga de configuración
  useEffect(() => {
    if (!isConfigReady) return;

    const rawAmount =
      config?.paramsHtml?.currency?.coinBoxRequiredAmount;
    if (rawAmount != null && !Number.isNaN(Number(rawAmount))) {
      setAmountService(formatCurrency(rawAmount));
    } else {
      setAmountService('0');
    }

    const tmo = config?.paramsHtml?.modalTimeouts;
    setTimeoutInsert(tmo?.timeoutInsertMoney);
    setTimeoutShowMessage(tmo?.timeoutShowMessage);

    log.info(
      `Config cargada | amountService=${rawAmount} | timeoutInsert=${tmo?.timeoutInsertMoney} | timeoutShowMessage=${tmo?.timeoutShowMessage}`
    );
  }, [isConfigReady, config]);

  // Lectura/escritura de input activo
  const getInputValue = () => {
    switch (activeInput) {
      case 'phone':
        return phone ?? '';
      case 'password':
        return password ?? '';
      case 'confirmPassword':
        return confirmPassword ?? '';
      default:
        return '';
    }
  };

  const setInputValue = (value) => {
    const safe = value ?? '';
    switch (activeInput) {
      case 'phone':
        setPhone(safe);
        break;
      case 'password':
        setPassword(safe);
        break;
      case 'confirmPassword':
        setConfirmPassword(safe);
        break;
      default:
        break;
    }
  };

  const addDigit = (digit) => {
    const current = getInputValue();
    if (activeInput === 'phone' && current.length >= 10) return;
    if (
      activeInput !== 'phone' &&
      current.length >= config?.paramsHtml.lenMaxInputPass
    )
      return;
    setInputValue(current + digit);
  };

  const removeDigit = () => {
    const current = getInputValue();
    setInputValue(current.slice(0, -1));
  };

  // Validaciones
  const validateCurrentInput = () => {
    let error = false;

    if (activeInput === 'phone') {
      const trimmedPhone = phone.trim();
      const invalid =
        trimmedPhone === '' || !PHONE_REGEX.test(trimmedPhone);
      setErrorsEmpty((prev) => ({ ...prev, phone: invalid }));
      if (invalid) {
        const msg =
          trimmedPhone === ''
            ? 'Ingresa el número celular.'
            : 'Número celular inválido.';
        setMsgPhone(msg);
        showAlert(msg, 'error');
        log.warn(
          `Validación teléfono falló | phone=${maskPhone(trimmedPhone)}`
        );
        error = true;
      }
    } else if (activeInput === 'password') {
      const invalid =
        password.trim() === '' ||
        password.length < config?.paramsHtml?.lenMinInputPass ||
        password.length > config?.paramsHtml?.lenMaxInputPass;
      setErrorsEmpty((prev) => ({ ...prev, password: invalid }));
      if (invalid) {
        const msg =
          password.trim() === ''
            ? 'Ingresa la contraseña.'
            : `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
        setMsgPass(msg);
        showAlert(msg, 'error');
        log.warn('Validación password falló');
        error = true;
      }
    } else if (!operationRet && activeInput === 'confirmPassword') {
      const invalid =
        confirmPassword.trim() === '' ||
        password !== confirmPassword ||
        confirmPassword.length <
        config?.paramsHtml?.lenMinInputPass ||
        confirmPassword.length >
        config?.paramsHtml?.lenMaxInputPass;
      setErrorsEmpty((prev) => ({
        ...prev,
        confirmPassword: invalid,
      }));
      if (invalid) {
        let msg = '';
        if (confirmPassword.trim() === '')
          msg = 'Confirma la contraseña.';
        else if (password !== confirmPassword)
          msg = 'Las contraseñas no coinciden.';
        else
          msg = `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
        setMsgConfPass(msg);
        showAlert(msg, 'error');
        log.warn('Validación confirmPassword falló');
        error = true;
      }
    }

    return !error;
  };

  const validateAllInputs = () => {
    let hasError = false;

    const trimmedPhone = phone.trim();
    const phoneInvalid =
      trimmedPhone === '' || !PHONE_REGEX.test(trimmedPhone);
    if (phoneInvalid) {
      const msg =
        trimmedPhone === ''
          ? 'Ingresa el número celular.'
          : 'Número celular inválido.';
      setMsgPhone(msg);
      setErrorsEmpty((prev) => ({ ...prev, phone: true }));
      showAlert(msg, 'error');
      log.warn(
        `Validación global teléfono falló | phone=${maskPhone(trimmedPhone)}`
      );
      hasError = true;
    } else {
      setErrorsEmpty((prev) => ({ ...prev, phone: false }));
    }

    const passInvalid =
      password.trim() === '' ||
      password.length < config?.paramsHtml?.lenMinInputPass ||
      password.length > config?.paramsHtml?.lenMaxInputPass;
    if (passInvalid) {
      const msg =
        password.trim() === ''
          ? 'Ingresa la contraseña.'
          : `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
      setMsgPass(msg);
      setErrorsEmpty((prev) => ({ ...prev, password: true }));
      showAlert(msg, 'error');
      log.warn('Validación global password falló');
      hasError = true;
    } else {
      setErrorsEmpty((prev) => ({ ...prev, password: false }));
    }

    if (!operationRet) {
      const confInvalid =
        confirmPassword.trim() === '' ||
        password !== confirmPassword ||
        confirmPassword.length <
        config?.paramsHtml?.lenMinInputPass ||
        confirmPassword.length >
        config?.paramsHtml?.lenMaxInputPass;
      if (confInvalid) {
        let msg = '';
        if (confirmPassword.trim() === '')
          msg = 'Confirma la contraseña.';
        else if (password !== confirmPassword)
          msg = 'Las contraseñas no coinciden.';
        else
          msg = `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
        setMsgConfPass(msg);
        setErrorsEmpty((prev) => ({
          ...prev,
          confirmPassword: true,
        }));
        showAlert(msg, 'error');
        log.warn(
          'Validación global confirmPassword falló'
        );
        hasError = true;
      } else {
        setErrorsEmpty((prev) => ({
          ...prev,
          confirmPassword: false,
        }));
      }
    }

    return !hasError;
  };

  const handleNextOrAccept = () => {
    const isLastStep =
      (operationRet && activeInput === 'password') ||
      (!operationRet && activeInput === 'confirmPassword');

    if (!isLastStep) {
      const isValid = validateCurrentInput();
      if (!isValid) return;

      if (activeInput === 'phone') {
        setActiveInput('password');
        passRef.current?.focus();
        log.debug('Paso -> phone → password');
      } else if (!operationRet && activeInput === 'password') {
        setActiveInput('confirmPassword');
        confirmRef.current?.focus();
        log.debug('Paso -> password → confirmPassword');
      }
      return;
    }

    const allValid = validateAllInputs();
    if (allValid) {
      log.info('Validación final OK, continuar');
      accept();
    }
  };

  const accept = async () => {
    setLoading(false);
    if (!operationRet) {
      setMessageLoading('Asignando Casilllero...');
      setConfirmDialogOpen(true);
      log.info(
        `ConfirmDialog abierto | phone=${maskPhone(phone)}`
      );
    } else {
      setMessageLoading('Buscando Casilllero...');
      setSecondsLeft(timeout);
      const payload = { phone, pin: password, openBy: 'user' };

      try {
        setLoading(true);
        speak(' ');
        log.info(
          `Apertura ${operation} solicitada | phone=${maskPhone(phone)}`
        );

        let result = null;
        let message = '';

        if (operation === 'Retirar') {
          result = await OpenSessionLocker(payload);
          message = config?.voice?.message?.openSessionLocker || '';
        } else if (operation === 'Reservado') {
          result = await OpenReserveLocker(payload);
          message = config?.voice?.message?.openReserveLocker || '';
        }

        if (result?.success) {
          const lockerCode =
            result?.data?.lockerCode ||
            result?.http?.data?.lockerCode ||
            '';
          if (lockerCode) {
            if (config?.voice?.enabled) {
              speak(
                message.replace('{{lockerCode}}', lockerCode) || ''
              );
            }
            setLocker(lockerCode);
            setShowLockerOpen(true);
            log.info(
              `Apertura exitosa | locker=${lockerCode}`
            );
          } else {
            setMessageErrorAPI(
              'No se recibió código de casillero'
            );
            setShowErrorAPIOpen(true);
            log.warn('Apertura sin lockerCode');
          }
        } else {
          const m =
            result?.data?.message ||
            'No se pudo realizar la apertura del casillero, ¡Inténtalo nuevamente!';
          setMessageErrorAPI(
            result?.status === 500
              ? 'No se pudo realizar la apertura del casillero, ¡Inténtalo nuevamente!'
              : m
          );
          setShowErrorAPIOpen(true);
          log.warn(
            `Apertura fallida | status=${result?.status} | msg=${m}`
          );
        }
      } catch (error) {
        setMessageErrorAPI(String(error));
        setShowErrorAPIOpen(true);
        log.error(`Excepción en apertura: ${String(error)}`);
      } finally {
        setLoading(false);
      }
    }
  };

  const showAlert = (msg, severity = 'error') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleTotalUpdate = (total) => {
    setAmountPay(total);
  };
  const handleLoadingChange = (v) => setLoading(v);

  const confirmSendData = async () => {
    setSecondsLeft(timeout);
    setConfirmDialogOpen(false);

    const payload = { phone, pin: password, openBy: 'user' };
    setInsertMoneyOpen(true);
    log.info(
      `Asignación solicitada | phone=${maskPhone(phone)}`
    );

    try {
      setLoading(true);
      speak(' ');
      const result = await paymentService(
        payload,
        timeoutInsert * 1000 * 3,
        handleTotalUpdate,
        handleLoadingChange
      );

      if (result?.http?.success) {
        const lockerCode = result?.http?.data?.lockerCode;
        if (lockerCode) {
          if (config?.voice?.enabled) {
            const message =
              (config?.voice?.message?.assignLocker || '').replace(
                '{{lockerCode}}',
                lockerCode || ''
              );
            speak(message || '');
          }
          setLocker(lockerCode);
          setShowLockerOpen(true);
          log.info(
            `Asignación exitosa | locker=${lockerCode}`
          );
        }
      } else {
        const status = result?.http?.status ?? result?.status;
        const m =
          status === 499
            ? 'Operación cancelada'
            : status === 500 || status == null
              ? 'No se pudo realizar la asignación del casillero, ¡Inténtalo nuevamente!'
              : result?.http?.data?.message ||
              'No se pudo realizar la asignación del casillero, ¡Inténtalo nuevamente!';

        setMessageErrorAPI(m);
        setShowErrorAPIOpen(true);
        log.warn(
          `Asignación fallida | status=${status} | msg=${m}`
        );
      }
    } catch (error) {
      setMessageErrorAPI(String(error));
      setShowErrorAPIOpen(true);
      log.error(`Excepción en asignación: ${String(error)}`);
    } finally {
      setInsertMoneyOpen(false);
      setAmountPay(0);
      cancelConfirmation(false);
      setLoading(false);
    }
  };

  const cancelConfirmation = () => {
    setConfirmDialogOpen(false);
    log.info('ConfirmDialog cerrado por usuario');
  };

  const confirmAssignLocker = () => {
    setShowLockerOpen(false);
    clearInputs();
    closeWebSocket();
    cancel();
    log.info('ShowLocker confirmado y flujo finalizado');
  };

  const confirmShowErrorAPI = () => {
    setShowErrorAPIOpen(false);
    cancelInsertMoney();
    setAmountPay(0);
    closeWebSocket();
    log.info('ShowErrorAPI confirmado');
  };

  // Render del botón del keypad
  const renderButton = (value) => {
    const commonProps = {
      variant: 'contained',
      disableRipple: true,
      tabIndex: -1,
      sx: {
        width: '100%',
        height: '100%',
        fontSize: theme.typography.h4.fontSize,
      },
    };
    const gridSize = value === 'Aceptar' ? 12 : 4;

    if (value === 'Aceptar') {
      const isFinalStep =
        (!operationRet && activeInput === 'confirmPassword') ||
        (operationRet && activeInput === 'password');

      return (
        <Grid size={gridSize} key={value}>
          <Button
            {...commonProps}
            color="success"
            id="confirmar-keypad"
            onClick={(e) => {
              handleNextOrAccept();
              const btn = e.currentTarget;
              setTimeout(() => btn.blur(), 0);
            }}
          >
            {isFinalStep ? 'Aceptar' : 'Siguiente'}
            {isFinalStep ? (
              <DoneAll
                sx={{
                  fontSize: theme.spacing(5),
                  ml: theme.spacing(1),
                }}
              />
            ) : (
              <ArrowForwardIos
                sx={{
                  fontSize: theme.spacing(5),
                  ml: theme.spacing(1),
                }}
              />
            )}
          </Button>
        </Grid>
      );
    }

    const icon = {
      Borrar: (
        <Backspace
          sx={{
            fontSize: theme.spacing(4),
            ml: theme.spacing(1),
          }}
        />
      ),
      Cancelar: (
        <Close
          sx={{
            fontSize: theme.spacing(4),
            ml: theme.spacing(1),
          }}
        />
      ),
    }[value];

    const handler =
      {
        Borrar: removeDigit,
        Cancelar: cancel,
      }[value] || (() => addDigit(value));

    const color =
      {
        Borrar: 'warning',
        Cancelar: 'error',
      }[value] || 'secondary';

    return (
      <Grid size={gridSize} key={value}>
        <Button
          {...commonProps}
          color={color}
          onClick={(e) => {
            handler();
            const btn = e.currentTarget;
            setTimeout(() => btn.blur(), 0);
          }}
        >
          {value}
          {icon}
        </Button>
      </Grid>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => { }}
        keepMounted={false}
        hideBackdrop
        disableEscapeKeyDown
        PaperProps={{
          sx: {
            width: {
              xs: '80%',
              sm: '80%',
              md: '60%',
              lg: '50%',
            },
            maxWidth: 'none',
            height: '100%',
            minHeight: '80vh',
            borderRadius: theme.spacing(3),
            p: theme.spacing(3),
          },
        }}
        slots={{ transition: Transition }}
        sx={{ zIndex: 1300, height: '100%' }}
      >
        {/* Header: timer + título */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2),
            position: 'relative',
            alignItems: 'center',
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: theme.spacing(1),
              position: 'absolute',
              right: theme.spacing(1),
              top: theme.spacing(1),
            }}
          >
            <Typography variant="h5">
              {formatTime(secondsLeft)}
            </Typography>
            <IconButton onClick={cancel}>
              <Close sx={{ fontSize: theme.spacing(5) }} />
            </IconButton>
          </Box>

          <Box sx={{ mt: theme.spacing(4) }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                textAlign: 'center',
                p: theme.spacing(1),
              }}
            >
              {operation}
            </Typography>
          </Box>
        </Box>

        <DialogContent sx={{ pt: theme.spacing(2) }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              px: { xs: 0, sm: theme.spacing(4) },
              gap: theme.spacing(4),
            }}
          >
            {/* Inputs */}
            <Box
              sx={{
                flex: '0 0 auto',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                alignItems: 'stretch',
                width: '100%',
                gap: theme.spacing(2),
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <MobileFriendly
                  sx={{
                    mr: theme.spacing(2),
                    fontSize: theme.spacing(7),
                  }}
                />
                <TextField
                  label="Número Celular"
                  value={phone}
                  variant="standard"
                  fullWidth
                  inputRef={phoneRef}
                  onFocus={() => setActiveInput('phone')}
                  InputProps={{ readOnly: true }}
                  error={errorsEmpty.phone}
                  helperText={errorsEmpty.phone ? msgPhone : ''}
                  sx={{
                    backgroundColor:
                      activeInput === 'phone'
                        ? '#dce1f5ff'
                        : 'transparent',
                    borderRadius: theme.spacing(1),
                    transition: 'background-color 0.3s ease',
                  }}
                />
              </Box>

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <Password
                  sx={{
                    mr: theme.spacing(2),
                    fontSize: theme.spacing(7),
                  }}
                />
                <TextField
                  label={`Contraseña (${config?.paramsHtml?.lenMaxInputPass} dígitos)`}
                  value={password}
                  variant="standard"
                  fullWidth
                  type="password"
                  inputMode="numeric"
                  inputRef={passRef}
                  onFocus={() => setActiveInput('password')}
                  InputProps={{ readOnly: true }}
                  error={errorsEmpty.password}
                  helperText={errorsEmpty.password ? msgPass : ''}
                  sx={{
                    backgroundColor:
                      activeInput === 'password'
                        ? '#dce1f5ff'
                        : 'transparent',
                    borderRadius: theme.spacing(1),
                    transition: 'background-color 0.3s ease',
                  }}
                />
              </Box>

              {!operationRet && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-end',
                  }}
                >
                  <Refresh
                    sx={{
                      mr: theme.spacing(2),
                      fontSize: theme.spacing(7),
                    }}
                  />
                  <TextField
                    label="Confirmar Contraseña"
                    value={confirmPassword}
                    variant="standard"
                    fullWidth
                    type="password"
                    inputMode="numeric"
                    inputRef={confirmRef}
                    onFocus={() =>
                      setActiveInput('confirmPassword')
                    }
                    InputProps={{ readOnly: true }}
                    error={errorsEmpty.confirmPassword}
                    helperText={
                      errorsEmpty.confirmPassword ? msgConfPass : ''
                    }
                    sx={{
                      backgroundColor:
                        activeInput === 'confirmPassword'
                          ? '#dce1f5ff'
                          : 'transparent',
                      borderRadius: theme.spacing(1),
                      transition: 'background-color 0.3s ease',
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Teclado */}
            <Box
              sx={{
                flex: '1 1 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Grid
                container
                spacing={1}
                sx={{
                  mt: theme.spacing(3),
                  height: '100%',
                }}
              >
                {keys().map(renderButton)}
              </Grid>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <SnackAlert
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={() => setSnackbarOpen(false)}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        onConfirm={confirmSendData}
        onCancel={cancelConfirmation}
        tittle="Confirmar"
        mesg={`¡Vas a ${operation}! ${config?.sendSMS
            ? '\nRecibirás un mensaje de texto con los datos ingresados.'
            : ''
          } \n¿El número celular es correcto?`}
        phone={formatNumberPhone(phone)}
        isPhone={true}
        hideBackdrop
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      <InsertMoney
        open={insertMoneyOpen}
        onCancel={cancelInsertMoney}
        amountService={amountService}
        amountPay={formatCurrency(amountPay)}
        phone={formatNumberPhone(phone)}
        timeout={timeoutInsert}
        hideBackdrop
      />

      <ShowLocker
        open={showLockerOpen}
        onConfirm={confirmAssignLocker}
        locker={locker}
        title="Tu casillero es el:"
        msg={
          operation !== 'Reservado'
            ? (operationRet ? 'Retira' : 'Guarda') +
            ' tus pertenencias, gracias por utilizar nuestro servicio'
            : 'gracias por utilizar nuestro servicio'
        }
        timeout={timeoutShowMessage}
        backColor={
          operation === 'Retirar'
            ? 'secondary.main'
            : operation === 'Guardar'
              ? 'primary.main'
              : 'info.main'
        }
        operation={operation}
        hideBackdrop
      />

      <ShowErrorAPI
        open={showErrorAPIOpen}
        onConfirm={confirmShowErrorAPI}
        msg={messageErrorAPI}
        timeout={timeoutShowMessage}
        hideBackdrop
      />

      {loading && <Loading message={messageLoading} />}
    </>
  );
};
