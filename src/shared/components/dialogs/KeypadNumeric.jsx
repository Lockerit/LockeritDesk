import {
  Backspace,
  Close,
  CheckCircle,
  MobileFriendly,
  Refresh,
  ArrowCircleRight,
  ArrowCircleLeft,
  Password,
  Cancel
} from '@mui/icons-material';
import {
  Button,
  TextField,
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Slide,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import {
  useState,
  useRef,
  forwardRef,
  useEffect,
  useCallback,
  useMemo
} from 'react';

import { paymentService } from '@services/apis/assignLocker.js';
import { OpenReserveLocker } from '@services/apis/openReserveLocker.js';
import { OpenSessionLocker } from '@services/apis/openSessionLocker.js';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { useElectronLockersColors } from '@shared/hooks/useLockersColors.js';
import { keypadButtonSx } from '@shared/theme/buttonSx.js';
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
import { ShowCloseLocker } from './ShowCloseLocker.jsx';
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
  const [messageConfirm, setMessageConfirm] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(timeout);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState();
  const [timeoutInsert, setTimeoutInsert] = useState();
  const [timeoutInsertHttp, setTimeoutInsertHttp] = useState();
  const [timeoutShowMessage, setTimeoutShowMessage] = useState();
  const [timeoutShowCloseLocker, setTimeoutShowCloseLocker] = useState();
  const [phoneConfirm, setPhoneConfirm] = useState(true);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [amountPay, setAmountPay] = useState(0);
  const [locker, setLocker] = useState('');
  const [confirmDialogOpen, setConfirmDialogOpen] = useState();
  const [insertMoneyOpen, setInsertMoneyOpen] = useState();
  const [showLockerOpen, setShowLockerOpen] = useState();
  const [showCloseLockerOpen, setShowCloseLockerOpen] = useState();
  const [showErrorAPIOpen, setShowErrorAPIOpen] = useState();
  const [insertMoneyKey, setInsertMoneyKey] = useState(0);
  const [colorLocker, setColorLocker] = useState('#000000');

  const phoneRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);
  const cleanupRef = useRef(null);
  const pendingOpenRef = useRef(null);
  const config = useElectronConfig();
  const lockersColors = useElectronLockersColors();
  const theme = useTheme();

  const inputValueByName = useMemo(
    () => ({
      phone,
      password,
      confirmPassword,
    }),
    [confirmPassword, password, phone]
  );

  const inputHighlightSx = useCallback(
    (name) => {
      const isActive = activeInput === name;
      return {
        backgroundColor: isActive
          ? theme.palette.action?.selected || alpha(theme.palette.secondary.main, 0.12)
          : 'transparent',
        borderRadius: theme.spacing(1),
        px: theme.spacing(1),
        transition: 'background-color 180ms ease',
        '& .MuiInputBase-input::placeholder': {
          fontStyle: 'normal',
        },
      };
    },
    [activeInput, theme]
  );

  const inputIconSx = useCallback(
    (name) => {
      const isActive = activeInput === name;

      const value = inputValueByName?.[name] ?? '';
      const hasValue = Boolean(String(value).trim());

      return {
        // Regla global: vacío => secondary, con texto => primary; en foco => secondary (sin opacidad)
        color: isActive ? 'secondary.main' : hasValue ? 'primary.main' : 'secondary.main',
        opacity: 1,
        transition: 'color 180ms ease',
      };
    },
    [activeInput, inputValueByName]
  );

  const operationRet = operation === 'Retirar' || operation === 'Reservado';
  const inputsCount = operationRet ? 2 : 3;
  const intervalRef = useRef(null);
  const cancellingRef = useRef(false);

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
    stopSpeaking();

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
    if (cancellingRef.current) return;
    cancellingRef.current = true;
    try {
      log.info('InsertMoney cancelado');
      setInsertMoneyOpen(false);
    } finally {
      // pequeña espera para “des-enchocar” efectos que vengan en cola
      setTimeout(() => { cancellingRef.current = false; }, 50);
    }

  }, []);

  const safeTimeoutInsert = useMemo(() => {
    const n = Number(timeoutInsert);
    return Number.isFinite(n) && n > 0 ? n : 600; // fallback sólido
  }, [timeoutInsert]);

  useEffect(() => {
    if (!lockersColors) return;
  }, [lockersColors]);

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

  // Al abrir el modal, enfocar el input del teléfono
  useEffect(() => {
    if (open) {
      setActiveInput('phone');
      // pequeño retardo para asegurar que el input esté montado
      setTimeout(() => {
        try {
          phoneRef.current?.focus();
          log.debug('Foco en input phone por apertura de KeypadNumeric');
        } catch {
          // noop
        }
      }, 50);
    }
  }, [open]);

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
    if (!config) return;

    const rawAmount =
      config?.paramsHtml?.currency?.coinBoxRequiredAmount;
    if (rawAmount != null && !Number.isNaN(Number(rawAmount))) {
      setAmountService(formatCurrency(rawAmount));
    } else {
      setAmountService('0');
    }

    const tmo = config?.paramsHtml?.modalTimeouts;
    const ti = Number(tmo?.timeoutInsertMoney);
    const ts = Number(tmo?.timeoutShowMessage);
    const tc = Number(tmo?.timeoutShowCloseLocker);
    setTimeoutInsert(Number.isFinite(ti) && ti > 0 ? ti : 600);
    setTimeoutInsertHttp((Number.isFinite(ti) && ti > 0 ? ti : 600) * 1000 * 3);
    setTimeoutShowMessage(Number.isFinite(ts) && ts > 0 ? ts : 10);
    setTimeoutShowCloseLocker(Number.isFinite(tc) && tc > 0 ? tc : 5);

    log.info(
      `Config cargada | amountService=${rawAmount} | timeoutInsert=${tmo?.timeoutInsertMoney} | timeoutShowMessage=${tmo?.timeoutShowMessage} | timeoutShowCloseLocker=${tmo?.timeoutShowCloseLocker}`
    );
  }, [config]);

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

  const handlePrevious = () => {
    if (activeInput === 'confirmPassword') {
      setActiveInput('password');
      passRef.current?.focus();
      log.debug('Paso <- confirmPassword → password');
      return;
    }

    if (activeInput === 'password') {
      setActiveInput('phone');
      phoneRef.current?.focus();
      log.debug('Paso <- password → phone');
    }
  };

  const accept = async () => {
    setLoading(false);

    if (operation === 'Reservado') {
      // Mostrar mensaje antes de consumir el servicio
      pendingOpenRef.current = { isRetirar: false };
      setShowLockerOpen(false);
      setShowCloseLockerOpen(true);
    }
    else {
      if (operation === 'Guardar') {
        setPhoneConfirm(true);
        setMessageConfirm([
          {
            text: '¡Vas a Guardar!',
            sx: { fontWeight: 'bold' },
          },
          config?.sendSMS
            ? {
              text: 'Recibirás un mensaje de texto con los datos ingresados.',
            }
            : null,
          {
            text: '¿El número celular es correcto?',
          },
        ].filter(Boolean)); // elimina los null
      } else if (operation === 'Retirar') {
        setPhoneConfirm(false);
        setMessageConfirm([
          {
            text: '¡AVISO IMPORTANTE!',
            sx: { fontWeight: 'bold', color: 'error.main' },
          },
          {
            text: 'El casillero es de un solo uso: una vez que se retira, no podrás volver a abrirlo.',
          },
          {
            text: `Asegúrate de sacar tus pertenencias.`,
            sx: { fontWeight: 'bold' },
          },
          {
            text: 'El casillero se liberará para ser asignado al próximo usuario.',
          }
        ]);
      }
      setConfirmDialogOpen(true);
      log.info(
        `ConfirmDialog abierto | phone=${maskPhone(phone)}`
      );
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

  const getLockerColor = (lockerCode, groups) => {
    if (!lockerCode || !Array.isArray(groups)) return null;

    const group = groups.find(g => g.lockers.includes(lockerCode));
    return group ? group.color : null;
  };

  const confirmSendData = async () => {
    setConfirmDialogOpen(false);

    if (operation === 'Guardar') {
      await confirmGuardarLocker();
      return;
    }

    if (operation === 'Retirar') {
      // Mostrar mensaje antes de consumir el servicio
      pendingOpenRef.current = { isRetirar: true };
      setShowLockerOpen(false);
      setShowCloseLockerOpen(true);
      return;
    }
  };

  const confirmGuardarLocker = async () => {

    setMessageLoading('Asignando Casilllero...');
    setSecondsLeft(timeout);

    const payload = { phone, pin: password, openBy: 'user' };

    setInsertMoneyKey(k => k + 1);
    setInsertMoneyOpen(true);
    log.info(
      `Asignación solicitada | phone=${maskPhone(phone)}`
    );

    try {
      setLoading(true);
      const result = await paymentService(
        payload,
        timeoutInsertHttp,
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
          setColorLocker(getLockerColor(lockerCode, lockersColors?.lockersColors) || '#000000');
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
            : status === 409
              ? 'Es posible que este número ya tenga un casillero activo, intenta de nuevo.'
              : status === 500 || status == null
                ? 'Error del sistema, intenta de nuevo o contacta a soporte.'
                : 'Error desconocido, intenta más tarde o contacta a soporte.';

        setMessageErrorAPI(m);
        setShowErrorAPIOpen(true);
        log.warn(
          `Asignación fallida | status=${status} | msg=${m}`
        );
      }
    } catch (error) {
      setMessageErrorAPI('Error inesperado en la asignación.');
      setShowErrorAPIOpen(true);
      log.error(`Excepción en asignación: ${String(error)}`);
    } finally {
      setInsertMoneyOpen(false);
      setAmountPay(0);
      cancelConfirmation(false);
      setLoading(false);
    }
  };

  const confirmRetirarReservadoLocker = async (isRetirar) => {

    setMessageLoading('Buscando Casilllero...');
    setSecondsLeft(timeout);
    const payload = { phone, pin: password, openBy: 'user' };

    try {
      setLoading(true);
      log.info(
        `Apertura ${operation} solicitada | phone=${maskPhone(phone)}`
      );

      let result = null;
      let message = '';

      if (isRetirar) {
        result = await OpenSessionLocker(payload);
        message = config?.voice?.message?.openSessionLocker || '';
      } else {
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
          setColorLocker(getLockerColor(lockerCode, lockersColors?.lockersColors) || '#000000');
          // Ya pasó el modal de cierre; ahora sí mostramos el locker
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
        const status = result?.http?.status ?? result?.status;
        const m =
          status === 404 || status === 401
            ? 'Datos incorrectos, intenta nuevamente.'
            : status === 500 || status == null
              ? 'Error del sistema, intenta de nuevo o contacta a soporte.'
              : 'Error desconocido, intenta más tarde o contacta a soporte.';

        setMessageErrorAPI(m);
        setShowErrorAPIOpen(true);
        log.warn(
          `Apertura fallida | status=${result?.status} | msg=${m}`
        );
      }
    } catch (error) {
      setMessageErrorAPI('Error inesperado en la apertura.');
      setShowErrorAPIOpen(true);
      log.error(`Excepción en apertura: ${String(error)}`);
    } finally {
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
    cancel();
    log.info('ShowLocker confirmado y flujo finalizado');
  };

  const confirmCloseLocker = async () => {
    setShowCloseLockerOpen(false);

    // Al cumplir el tiempo del modal, recién consumimos el servicio y luego mostramos ShowLocker.
    const pending = pendingOpenRef.current;
    pendingOpenRef.current = null;

    if (pending?.isRetirar === true) {
      await confirmRetirarReservadoLocker(true);
      return;
    }

    if (pending?.isRetirar === false) {
      await confirmRetirarReservadoLocker(false);
    }
  };

  const confirmShowErrorAPI = () => {
    setShowErrorAPIOpen(false);
    // cancelInsertMoney();
    setAmountPay(0);
    setMessageErrorAPI('');
    log.info('ShowErrorAPI confirmado');
  };

  // Render del botón del keypad
  const renderButton = (value) => {
    const isNeutralDigit = !['Aceptar', 'Borrar', 'Cerrar', 'Anterior'].includes(value);
    const isBorrar = value === 'Borrar';
    const isControl = ['Aceptar', 'Borrar', 'Cerrar', 'Anterior'].includes(value);
    const neutralMain = theme.palette.tertiary?.main || theme.palette.text.primary;
    const neutralContrast =
      theme.palette.tertiary?.contrastText || theme.palette.getContrastText(neutralMain);
    const commonProps = {
      variant: 'contained',
      disableRipple: true,
      tabIndex: -1,
      sx: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textTransform: 'none',
        ...keypadButtonSx(theme),
        ...(isNeutralDigit
          ? {
            '&.MuiButton-contained': {
              backgroundColor: `${neutralMain} !important`,
              color: neutralContrast,
              border: `2px solid ${alpha(theme.palette.text.primary, 0.45)}`,
              boxShadow: 'none',
            },
            '&.MuiButton-contained:hover': {
              backgroundColor: `${alpha(neutralMain, 0.9)} !important`,
              boxShadow: 'none',
            },
            '&.MuiButton-contained:active': {
              backgroundColor: `${alpha(neutralMain, 0.82)} !important`,
            },
          }
          : {}),
        ...(isBorrar
          ? {
            '&.MuiButton-contained': {
              backgroundColor: `${theme.palette.warning.light} !important`,
              color: theme.palette.warning.contrastText,
              border: `2px solid ${alpha(theme.palette.warning.main, 0.5)}`,
            },
            '&.MuiButton-contained:hover': {
              backgroundColor: `${theme.palette.warning.main} !important`,
            },
          }
          : {}),
      },
    };
    const isFinalStep =
      (!operationRet && activeInput === 'confirmPassword') ||
      (operationRet && activeInput === 'password');

    if (value === 'Aceptar') {
      return (
        <Box
          key={value}
          sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
          }}
        >
          <Button
            {...commonProps}
            color="primary"
            id="confirmar-keypad"
            sx={{ ...(commonProps.sx || {}), ...(isControl ? {
              fontSize: {
                xs: theme.typography.h6.fontSize,
                sm: theme.typography.h5.fontSize,
                md: theme.typography.h4.fontSize,
              }
            } : {}) }}
            onClick={(e) => {
              handleNextOrAccept();
              const btn = e.currentTarget;
              setTimeout(() => btn.blur(), 0);
            }}
          >
            {isFinalStep ? 'Aceptar' : 'Siguiente'}
            {isFinalStep ? (
              <CheckCircle
                sx={{
                  fontSize: {
                    xs: theme.spacing(4),
                    sm: theme.spacing(4.5),
                    md: theme.spacing(5),
                  },
                  ml: theme.spacing(1),
                }}
              />
            ) : (
              <ArrowCircleRight
                sx={{
                  fontSize: {
                    xs: theme.spacing(4),
                    sm: theme.spacing(4.5),
                    md: theme.spacing(5),
                  },
                  ml: theme.spacing(1),
                }}
              />
            )}
          </Button>
        </Box>
      );
    }

    const icon = {
      Borrar: (
        <Backspace
          sx={{
            fontSize: {
              xs: theme.spacing(3.5),
              sm: theme.spacing(4),
              md: theme.spacing(4),
            },
            ml: theme.spacing(1),
          }}
        />
      ),
      Cerrar: (
        <Cancel
          sx={{
            fontSize: {
              xs: theme.spacing(3.5),
              sm: theme.spacing(4),
              md: theme.spacing(4),
            },
            ml: theme.spacing(1),
          }}
        />
      ),
      Anterior: (
        <ArrowCircleLeft
          sx={{
            fontSize: {
              xs: theme.spacing(4),
              sm: theme.spacing(4.5),
              md: theme.spacing(5),
            },
            ml: theme.spacing(1),
          }}
        />
      ),
    }[value];

    const handler =
      {
        Borrar: removeDigit,
        Cerrar: cancel,
        Anterior: handlePrevious,
      }[value] || (() => addDigit(value));

    const color =
      {
        Borrar: 'warning',
        Cerrar: 'error',
        Anterior: 'secondary',
      }[value] || (isNeutralDigit ? 'inherit' : 'secondary');

    const isPreviousDisabled = value === 'Anterior' && activeInput === 'phone';

    return (
      <Box
        key={value}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
        }}
      >
        <Button
          {...commonProps}
          color={color}
          disabled={isPreviousDisabled}
          sx={{ ...(commonProps.sx || {}), ...(isControl ? {
            fontSize: {
              xs: theme.typography.h6.fontSize,
              sm: theme.typography.h5.fontSize,
              md: theme.typography.h4.fontSize,
            }
          } : {}) }}
          onClick={(e) => {
            handler();
            const btn = e.currentTarget;
            setTimeout(() => btn.blur(), 0);
          }}
        >
          {value}
          {icon}
        </Button>
      </Box>
    );
  };

  const keypadKeys = useMemo(() => keys(), []);
  const mainKeys = useMemo(
    () => keypadKeys.filter((value) => !['Anterior', 'Aceptar'].includes(value)),
    [keypadKeys]
  );

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
              xs: config?.paramsHtml?.isVertical ? '85%' : '70%',
              sm: config?.paramsHtml?.isVertical ? '80%' : '65%',
              md: config?.paramsHtml?.isVertical ? '70%' : '55%',
              lg: config?.paramsHtml?.isVertical ? '60%' : '50%',
            },
            maxWidth: 'none',
            // usar vh para layout predecible y permitir distribuir 100% sin scroll
            height: {
              xs: config?.paramsHtml?.isVertical ? '95vh' : '95vh',
              sm: config?.paramsHtml?.isVertical ? '95vh' : '95vh',
              md: config?.paramsHtml?.isVertical ? '90vh' : '90vh',
              lg: config?.paramsHtml?.isVertical ? '90vh' : '90vh',
            },
            minHeight: {
              xs: config?.paramsHtml?.isVertical ? '95vh' : '95vh',
              sm: config?.paramsHtml?.isVertical ? '95vh' : '95vh',
              md: config?.paramsHtml?.isVertical ? '90vh' : '90vh',
              lg: config?.paramsHtml?.isVertical ? '90vh' : '90vh',
            },
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            // borderRadius/padding/boxShadow vienen del theme (MuiDialog/MuiPaper)
          },
        }}
        slots={{ transition: Transition }}
        sx={{ zIndex: 1300, height: '100%' }}
      >
        {/* Header con título centrado real */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            px: theme.spacing(1),
            pt: theme.spacing(1),
            pb: theme.spacing(1),
          }}
        >
          <Box />

          <Typography
            variant="h4"
            sx={{
              fontWeight: 'bold',
              textAlign: 'center',
              p: theme.spacing(1),
              fontSize: {
                xs: theme.typography.h5.fontSize,
                sm: theme.typography.h4.fontSize,
                md: theme.typography.h3.fontSize,
              },
            }}
          >
            {operation}
          </Typography>

          <Box
            sx={{
              justifySelf: 'end',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(1),
            }}
          >
            <Typography variant="h5">{formatTime(secondsLeft)}</Typography>
            <IconButton onClick={cancel} aria-label="Cerrar">
              <Close
                sx={{
                  fontSize: {
                    xs: theme.spacing(4),
                    sm: theme.spacing(4.5),
                    md: theme.spacing(5),
                  },
                }}
              />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{
          pt: {
            xs: theme.spacing(1),
            sm: theme.spacing(1.5),
            md: theme.spacing(2),
          },
          pb: {
            xs: theme.spacing(1.5),
            sm: theme.spacing(2),
            md: theme.spacing(2.5),
          },
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              // justifyContent: 'space-between',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              px: {
                xs: config?.paramsHtml?.isVertical ? 0 : theme.spacing(0.5),
                sm: config?.paramsHtml?.isVertical ? theme.spacing(2) : theme.spacing(2),
                md: config?.paramsHtml?.isVertical ? theme.spacing(3) : theme.spacing(3),
              },
              gap: {
                xs: config?.paramsHtml?.isVertical ? theme.spacing(1) : theme.spacing(0.75),
                sm: theme.spacing(1.5),
                md: theme.spacing(2),
              },
            }}
          >
            {/* Inputs */}
            <Box
              sx={{
                // Inputs ocuparán 40% del alto cuando la pantalla sea vertical
                flex: config?.paramsHtml?.isVertical ? '0 0 35%' : '0 0 30%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: inputsCount >= 2 ? 'space-evenly' : 'flex-start',
                alignItems: 'stretch',
                width: '100%',
                gap: {
                  xs: theme.spacing(0.5),
                  sm: theme.spacing(0.75),
                  md: theme.spacing(1),
                },
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
                    mr: theme.spacing(1),
                    fontSize: {
                      xs: theme.spacing(5),
                      sm: theme.spacing(6),
                      md: theme.spacing(7),
                    },
                    ...inputIconSx('phone'),
                  }}
                />
                <TextField
                  label="Número Celular"
                  placeholder="Número Celular"
                  value={phone}
                  variant="standard"
                  fullWidth
                  inputRef={phoneRef}
                  onFocus={() => setActiveInput('phone')}
                  inputProps={{ 'aria-label': 'Número celular' }}
                  InputProps={{ readOnly: true }}
                  error={errorsEmpty.phone}
                  helperText={errorsEmpty.phone ? msgPhone : ''}
                  sx={{ mb: 0, ...inputHighlightSx('phone') }}
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
                    mr: theme.spacing(1),
                    fontSize: {
                      xs: theme.spacing(5),
                      sm: theme.spacing(6),
                      md: theme.spacing(7),
                    },
                    ...inputIconSx('password'),
                  }}
                />
                <TextField
                  label={`Contraseña (${config?.paramsHtml?.lenMaxInputPass} dígitos)`}
                  placeholder={`Contraseña (${config?.paramsHtml?.lenMaxInputPass} dígitos)`}
                  value={password}
                  variant="standard"
                  fullWidth
                  type="password"
                  inputMode="numeric"
                  inputRef={passRef}
                  onFocus={() => setActiveInput('password')}
                  inputProps={{ 'aria-label': 'Contraseña' }}
                  InputProps={{ readOnly: true }}
                  error={errorsEmpty.password}
                  helperText={errorsEmpty.password ? msgPass : ''}
                  sx={{ mb: 0, ...inputHighlightSx('password') }}
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
                      mr: theme.spacing(1),
                      fontSize: {
                        xs: theme.spacing(5),
                        sm: theme.spacing(6),
                        md: theme.spacing(7),
                      },
                      ...inputIconSx('confirmPassword'),
                    }}
                  />
                  <TextField
                    label="Confirmar Contraseña"
                    placeholder="Confirmar Contraseña"
                    value={confirmPassword}
                    variant="standard"
                    fullWidth
                    type="password"
                    inputMode="numeric"
                    inputRef={confirmRef}
                    onFocus={() =>
                      setActiveInput('confirmPassword')
                    }
                    inputProps={{ 'aria-label': 'Confirmar contraseña' }}
                    InputProps={{ readOnly: true }}
                    error={errorsEmpty.confirmPassword}
                    helperText={
                      errorsEmpty.confirmPassword ? msgConfPass : ''
                    }
                    sx={{ mb: 0, ...inputHighlightSx('confirmPassword') }}
                  />
                </Box>
              )}
            </Box>

            {/* Teclado */}
            <Box
              sx={{
                // Teclado ocupará 60% del alto en vertical
                flex: config?.paramsHtml?.isVertical ? '0 0 60%' : '1 1 60%',
                display: 'flex',
                alignItems: 'stretch',
                justifyContent: 'center',
                width: '100%',
              }}
            >
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  // en vertical distribuimos 4 filas iguales para los dígitos y una fila final para controles
                  gridTemplateRows: config?.paramsHtml?.isVertical
                    ? 'repeat(5, 1fr)'
                    : 'repeat(5, minmax(72px, 1fr))',
                  gap: {
                    xs: theme.spacing(0.5),
                    sm: theme.spacing(0.75),
                    md: theme.spacing(1),
                  },
                  mt: {
                    xs: config?.paramsHtml?.isVertical ? theme.spacing(0.5) : theme.spacing(0.5),
                    sm: theme.spacing(1),
                    md: theme.spacing(2),
                  },
                  height: '100%',
                  width: '100%',
                  alignItems: 'stretch',
                }}
              >
                {mainKeys.map(renderButton)}
                <Box
                  sx={{
                    gridColumn: '1 / -1',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: {
                      xs: theme.spacing(0.5),
                      sm: theme.spacing(0.75),
                      md: theme.spacing(1),
                    },
                    alignItems: 'center',
                    // asegurar la fila final tenga suficiente espacio y padding
                    minHeight: {
                      xs: theme.spacing(7),
                      sm: theme.spacing(8),
                    },
                    py: {
                      xs: theme.spacing(0.5),
                      sm: theme.spacing(1),
                    },
                  }}
                >
                  {['Anterior', 'Aceptar'].map(renderButton)}
                </Box>
              </Box>
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
        msg={messageConfirm}
        phone={formatNumberPhone(phone)}
        isPhone={phoneConfirm}
        isCloseDoor={true}
        hideBackdrop
      />

      <InsertMoney
        key={insertMoneyKey}
        open={insertMoneyOpen}
        onCancel={cancelInsertMoney}
        amountService={amountService}
        amountPay={formatCurrency(amountPay)}
        phone={formatNumberPhone(phone)}
        timeout={safeTimeoutInsert}
        hideBackdrop
      />

      <ShowCloseLocker
        open={showCloseLockerOpen}
        onConfirm={confirmCloseLocker}
        msg={'¡DEJA EL CASILLERO CERRADO!'}
        timeout={timeoutShowCloseLocker}
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
        backColor={colorLocker}
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
