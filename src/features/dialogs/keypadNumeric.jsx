import { useState, useRef, forwardRef, useEffect } from 'react';
import {
  Backspace,
  Close,
  DoneAll,
  MobileFriendly,
  Refresh,
  ArrowForwardIos,
  Password
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
import SnackBarAlert from '../bar/snackAlert.jsx';
import ConfirmDialog from './confirmDialog.jsx';
import InsertMoney from './insertMoney.jsx';
import ShowErrorAPI from './showErrorAPI.jsx';
import { paymentService } from '../apis/assignLocker.js';
import LoadingScreen from './loading.jsx';
import ShowLocker from './showLocker.jsx';
import OpenSessionLocker from '../apis/openReserveLocker.js';
import OpenReserveLocker from '../apis/openReserveLocker.js';
import {
  formatTime,
  phoneRegex,
  keys,
  formatNumberPhone,
  formatCurrency
} from '../utils/utils.js';
import {
  closeWebSocket
} from '../apis/websocket.js'
import { useElectronConfig } from '../hooks/useConfig.js';
import { getVoices, speak, stopSpeaking } from '../utils/speak.js'
import { cancelObservable } from '../utils/cancelObservable.js';
import { useWindowSizeContext } from '../context/windowSizeContext.jsx'; // Hook para tamaño pantalla
import { scaledDimension } from '../utils/scaledDimension.js';
import { useModal } from "../context/modalContext.jsx";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'keypad';

export default function KeyPadModal({
  open,
  onClose,
  operation,
  timeout = 600
}) {
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

  const {
    phone, setPhone,
    password, setPassword,
    confirmPassword, setConfirmPassword,
    amountPay, setAmountPay,
    locker, setLocker,
    confirmDialogOpen, setConfirmDialogOpen,
    insertMoneyOpen, setInsertMoneyOpen,
    showLockerOpen, setShowLockerOpen,
    showErrorAPIOpen, setShowErrorAPIOpen
  } = useModal();

  // Refs para cambiar el foco
  const size = useWindowSizeContext();
  const scale = size.factor || 1; // de tu hook useElectronScreenData()
  const phoneRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);
  const cleanupRef = useRef(null);
  const config = useElectronConfig();


  const operationRet = (operation === 'Retirar' || operation === 'Reservado') ? true : false;
  const isConfigReady = config && Object.keys(config).length > 0;

  useEffect(() => {
    setMessageErrorAPI(
      'No te preocupes, el proceso continuará con el monto que hayas ingresado hasta ahora, vuelve a intentarlo.'
    );

    if (insertMoneyOpen) {
      setShowErrorAPIOpen(true);
      const timer = setTimeout(() => {
        cancelInsertMoney();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (open) {
      stopSpeaking(); // cortar audio cuando se abre
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      stopSpeaking(); // cortar audio cuando se abre
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      setSecondsLeft(timeout); // reinicia cada vez que abre
    }
  }, [open, timeout]);

  // Manejar conteo
  useEffect(() => {
    if (!open || secondsLeft <= 0) return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [open, secondsLeft]);

  // Cerrar automáticamente cuando llegue a 0
  useEffect(() => {
    if (open && secondsLeft === 0) {
      setSecondsLeft(timeout);
      cancel();
    }
  }, [open, secondsLeft]);

  useEffect(() => {
    if (!isConfigReady) return;

    const rawAmount = config?.paramsHtml?.currency?.coinBoxRequiredAmount;

    if (rawAmount != null && !isNaN(Number(rawAmount))) {
      setAmountService(formatCurrency(rawAmount));
    } else {
      setAmountService('0'); // o '', o lo que desees mostrar si no hay valor
    }

    if (config?.paramsHtml?.modalTimeouts?.timeoutKeypad) {
      setTimeoutInsert(config?.paramsHtml?.modalTimeouts?.timeoutInsertMoney);
      setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
    }
  }, [config, open])

  const getInputValue = () => {
    switch (activeInput) {
      case 'phone': return phone;
      case 'password': return password;
      case 'confirmPassword': return confirmPassword;
      default: return '';
    }
  };

  const setInputValue = (value) => {
    switch (activeInput) {
      case 'phone': setPhone(value); break;
      case 'password': setPassword(value); break;
      case 'confirmPassword': setConfirmPassword(value); break;
    }
  };

  const addDigit = (digit) => {
    const current = getInputValue();
    if (activeInput === 'phone' && current.length >= 10) return;
    if (activeInput !== 'phone' && current.length >= config?.paramsHtml.lenMaxInputPass) return;
    setInputValue(current + digit);
  };

  const removeDigit = () => {
    const current = getInputValue();
    setInputValue(current.slice(0, -1));
  };

  const validateCurrentInput = () => {
    let error = false;

    if (activeInput === 'phone') {
      const trimmedPhone = phone.trim();
      const isEmpty = trimmedPhone === '';
      const invalidFormat = !phoneRegex.test(trimmedPhone);
      setErrorsEmpty(prev => ({ ...prev, phone: isEmpty || invalidFormat }));
      if (isEmpty) {
        const msg = 'Ingresa el número celular.';
        setMsgPhone(msg);
        showAlert(msg, 'error');
        error = true;
      } else if (invalidFormat) {
        const msg = 'Número celular inválido.';
        setMsgPhone(msg);
        showAlert(msg, 'error');
        error = true;
      }
    } else if (activeInput === 'password') {
      const isEmpty = password.trim() === '';
      setErrorsEmpty(prev => ({ ...prev, password: isEmpty }));
      if (isEmpty) {
        const msg = 'Ingresa la contraseña.';
        setMsgPass(msg);
        showAlert(msg, 'error');
        error = true;
      } else if ((password.length < config?.paramsHtml?.lenMinInputPass) || (password.length > config?.paramsHtml?.lenMaxInputPass)) {
        const msg = `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
        setMsgPass(msg);
        showAlert(msg, 'error');
        setErrorsEmpty(prev => ({ ...prev, password: true }));
        error = true;
      }
    } else if (!operationRet) {
      if (activeInput === 'confirmPassword') {
        const isEmpty = confirmPassword.trim() === '';
        const noMatch = password !== confirmPassword;
        setErrorsEmpty(prev => ({
          ...prev,
          confirmPassword: isEmpty || noMatch,
        }));
        if (isEmpty) {
          const msg = 'Confirma la contraseña.';
          setMsgConfPass(msg);
          showAlert(msg, 'error');
          error = true;
        } else if (noMatch) {
          const msg = 'Las contraseñas no coinciden.';
          setMsgConfPass(msg);
          showAlert(msg, 'error');
          error = true;
        } else if ((confirmPassword.length < config?.paramsHtml?.lenMinInputPass) || (confirmPassword.length > config?.paramsHtml?.lenMaxInputPass)) {
          const msg = `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
          setMsgConfPass(msg);
          showAlert(msg, 'error');
          setErrorsEmpty(prev => ({ ...prev, confirmPassword: true }));
          error = true;
        }
      }
    }
    return !error; // true si todo está OK
  };

  const validateAllInputs = () => {
    let hasError = false;

    // Validación del celular
    const trimmedPhone = phone.trim();
    const phoneInvalid = trimmedPhone === '' || !phoneRegex.test(trimmedPhone);
    if (phoneInvalid) {
      const msg = trimmedPhone === '' ? 'Ingresa el número celular.' : 'Número celular inválido.';
      setMsgPhone(msg);
      setErrorsEmpty(prev => ({ ...prev, phone: true }));
      showAlert(msg, 'error');
      hasError = true;
    } else {
      setErrorsEmpty(prev => ({ ...prev, phone: false }));
    }

    // Validación contraseña
    const passInvalid = password.trim() === '' || (password.length < config?.paramsHtml?.lenMinInputPass) || (password.length > config?.paramsHtml?.lenMaxInputPass);
    if (passInvalid) {
      const msg = password.trim() === '' ? 'Ingresa la contraseña.' : `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
      setMsgPass(msg);
      setErrorsEmpty(prev => ({ ...prev, password: true }));
      showAlert(msg, 'error');
      hasError = true;
    } else {
      setErrorsEmpty(prev => ({ ...prev, password: false }));
    }

    if (!operationRet) {
      // Validación confirmación contraseña
      const confInvalid = confirmPassword.trim() === '' || password !== confirmPassword || (confirmPassword.length < config?.paramsHtml?.lenMinInputPass) || (confirmPassword.length > config?.paramsHtml?.lenMaxInputPass);
      if (confInvalid) {
        let msg = '';
        if (confirmPassword.trim() === '') msg = 'Confirma la contraseña.';
        else if (password !== confirmPassword) msg = 'Las contraseñas no coinciden.';
        else msg = `La contraseña debe tener ${config?.paramsHtml?.lenMaxInputPass} dígitos.`;
        setMsgConfPass(msg);
        setErrorsEmpty(prev => ({ ...prev, confirmPassword: true }));
        showAlert(msg, 'error');
        hasError = true;
      } else {
        setErrorsEmpty(prev => ({ ...prev, confirmPassword: false }));
      }
    }

    return !hasError;
  };

  const handleNextOrAccept = () => {
    const isLastStep = (operationRet && activeInput === 'password') ||
      (!operationRet && activeInput === 'confirmPassword');

    if (!isLastStep) {
      // Validación paso a paso como ya tienes
      const isValid = validateCurrentInput();
      if (!isValid) return;

      if (activeInput === 'phone') {
        setActiveInput('password');
        passRef.current?.focus();
      } else if (!operationRet && activeInput === 'password') {
        setActiveInput('confirmPassword');
        confirmRef.current?.focus();
      }
      return;
    }

    // Validación FINAL (antes de mostrar el diálogo)
    const allValid = validateAllInputs();
    if (allValid) {
      accept(); // Mostrar el diálogo de confirmación
    }
  };

  const accept = async () => {
    setLoading(false);
    if (!operationRet) {
      setMessageLoading('Asignando Casilllero...');
      setConfirmDialogOpen(true); // Mostrar confirmación
    } else {
      setMessageLoading('Buscando Casilllero...');
      setSecondsLeft(timeout);
      const openBy = 'user';

      const payload = {
        phone: phone,
        pin: password,
        openBy: openBy
      }

      try {
        setLoading(true);
        speak(" ");

        let result = null;
        let message = '';

        if (operation === 'Retirar') {
          result = await OpenSessionLocker(payload);
          message = config?.voice?.message?.openSessionLocker || "";
        } else if (operation === 'Reservado') {
          result = await OpenReserveLocker(payload);
          message = config?.voice?.message?.openReserveLocker || "";
        }

        console.log("result: ", result)

        if (result?.success) {

          const lockerCode = result?.data?.lockerCode || result?.http?.data?.lockerCode || '';
          if (lockerCode) {

            if (config?.voice?.enabled) {
              // Reemplazo dinámico del placeholder
              message = message.replace("{{lockerCode}}", lockerCode || '');
              speak(message || "");
            }

            setLocker(lockerCode);
            setShowLockerOpen(true);
          } else {
            setMessageErrorAPI('No se recibió código de casillero');
            setShowErrorAPIOpen(true);
          }
        } else {
          if (result?.status === 500) {
            setMessageErrorAPI('No se pudo realizar la apertura del casillero, ¡Inténtalo nuevamente!');
          } else {
            setMessageErrorAPI(result?.data?.message || 'No se pudo realizar la apertura del casillero, ¡Inténtalo nuevamente!');
          }
          setShowErrorAPIOpen(true);
        }

        setLoading(false);

      } catch (error) {
        setMessageErrorAPI(error);
        setShowErrorAPIOpen(true);
        setLoading(false);
      } finally {
        setLoading(false);
      }
    }

    setLoading(false);
  };

  const clearInputs = () => {
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    // setLocker('');
    setActiveInput('phone');
    setErrorsEmpty({ phone: false, password: false, confirmPassword: false });
    cancelConfirmation();
  }

  const cancel = () => {
    clearInputs();
    onClose();
  };

  const showAlert = (msg, severity = 'error') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleTotalUpdate = (total) => {
    setAmountPay(total);
  };

  const handleLoadingChange = (loading) => {
    setLoading(loading);
  };

  const confirmSendData = async () => {

    setSecondsLeft(timeout);
    setConfirmDialogOpen(false);

    const openBy = 'user';

    const payload = {
      phone: phone,
      pin: password,
      openBy: openBy
    }

    setInsertMoneyOpen(true);

    try {
      setLoading(true);
      speak(" ");

      const result = await paymentService(payload, (timeoutInsert * 1000 * 3), handleTotalUpdate, handleLoadingChange);
      if (result?.http?.success) {

        const lockerCode = result?.http?.data?.lockerCode;
        if (lockerCode) {

          if (config?.voice?.enabled) {
            let message = config?.voice?.message?.assignLocker || "";
            // Reemplazo dinámico del placeholder
            message = message.replace("{{lockerCode}}", lockerCode || '');
            speak(message || "");
          }

          setLocker(lockerCode);
          setShowLockerOpen(true);
        }
      } else {
        if (result?.http?.status === 499) {
          setMessageErrorAPI('Operación cancelada');
        } else if (result?.status === null || result?.status === 500 || result?.http?.status === 500) {
          setMessageErrorAPI('No se pudo realizar la asignación del casillero, ¡Inténtalo nuevamente!');
        } else {
          setMessageErrorAPI(result?.http?.data?.message || 'No se pudo realizar la asignación del casillero, ¡Inténtalo nuevamente!');
        }
        setShowErrorAPIOpen(true);
      }

      setLoading(false);

    } catch (error) {
      setMessageErrorAPI(error);
      setShowErrorAPIOpen(true);
      setLoading(false);
    } finally {
      setInsertMoneyOpen(false);
      setAmountPay(0);
      cancelConfirmation(false);
      setLoading(false);
    }
    setLoading(false);
  };

  const cancelConfirmation = () => {
    setConfirmDialogOpen(false);
  };

  const cancelInsertMoney = () => {
    if (cleanupRef.current) cleanupRef.current();
    cancelObservable.setCancel(true);
    setAmountPay(0);
    closeWebSocket();
  };

  const confirmAssignLocker = () => {
    setShowLockerOpen(false);
    clearInputs();
    closeWebSocket();
    cancel();
  };

  const confirmShowErrorAPI = () => {
    setShowErrorAPIOpen(false);
    setAmountPay(0);  // resetear monto a pagar
    closeWebSocket();
  };

  const renderButton = (value) => {

    const commonProps = {
      variant: "contained",
      disableRipple: true,
      tabIndex: -1,
      sx: {
        width: "100%",
        height: "100%",
        fontSize: `${32 * scale}px`,
      },
    };

    const gridSize = value === "Aceptar" ? 12 : 4;

    if (value === "Aceptar") {
      const isFinalStep =
        (!operationRet && activeInput === "confirmPassword") ||
        (operationRet && activeInput === "password");

      return (
        <Grid size={gridSize} key={value}>
          <Button
            {...commonProps}
            color="success"
            id="confirmar-keypad"
            onClick={(e) => {
              handleNextOrAccept();
              const btn = e.currentTarget; // ✅ guardamos referencia
              setTimeout(() => btn.blur(), 0);
            }}
          >
            {isFinalStep ? "Aceptar" : "Siguiente"}
            {isFinalStep ? (
              <DoneAll sx={{ fontSize: 40 * scale, ml: 1 * scale }} />
            ) : (
              <ArrowForwardIos sx={{ fontSize: 40 * scale, ml: 1 * scale }} />
            )}
          </Button>
        </Grid>
      );
    }

    const icon = {
      Borrar: <Backspace sx={{ fontSize: 32 * scale, ml: 1 * scale }} />,
      Cancelar: <Close sx={{ fontSize: 32 * scale, ml: 1 * scale }} />,
    }[value];

    const handler =
      {
        Borrar: removeDigit,
        Cancelar: cancel,
      }[value] || (() => addDigit(value));

    const color =
      {
        Borrar: "warning",
        Cancelar: "error",
      }[value] || "secondary";

    return (
      <Grid size={gridSize} key={value}>
        <Button
          {...commonProps}
          color={color}
          onClick={(e) => {
            handler();
            const btn = e.currentTarget; // ✅ guardamos referencia
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
        hideBackdrop               // 👈 evita bloquear clics en el fondo
        disableEscapeKeyDown
        disableEnforceFocus        // 👈 no fuerza el foco al modal
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: {
            width: scaledDimension(
              {
                xs: { base: 90, min: 80, max: 90 }, // en % para mobile
                sm: { base: 90, min: 80, max: 90 }, // tablet
                md: { base: 60, min: 50, max: 70 }, // desktop medio
                lg: { base: 50, min: 40, max: 50 }, // desktop grande
              },
              scale
            ),
            maxWidth: 'none', // Lo dejas libre, sin límite de MUI
            height: '100%',
            minHeight: '80%',
            borderRadius: `${Math.max(8, 16 * scale)}px`, // Opcional: esquinas redondeadas escaladas
            p: 2 * scale // Opcional: padding escalado
          }
        }}
        slots={{
          transition: Transition,
        }}
        sx={{ zIndex: 1300, height: '100%' }} // Asegura que el diálogo esté por encima de otros elementos
      >

        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2 * scale,
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            height: '5%'
          }}
        >
          {/* Encabezado superior: tiempo y botón cerrar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1 * scale,
              position: 'absolute',
              right: 3 * scale,
              top: 3 * scale,
            }}
          >
            <Typography variant="h5">
              {formatTime(secondsLeft)}
            </Typography>
            <IconButton onClick={cancel}>
              <Close sx={{ fontSize: 40 * scale }} />
            </IconButton>
          </Box>

          <Box sx={{ mt: 2 * scale }}>
            {/* Texto centrado */}
            <Typography
              variant="h4"
              sx={{ fontWeight: 'bold', textAlign: 'center', p: 2 * scale }}
            >
              {operation}
            </Typography>
          </Box>
        </Box>


        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              alignItems: "center",
              height: "100%",
              width: "100%",
              px: 4 * scale,
            }}
          >
            {/* Sección Inputs - 25% */}
            <Box
              sx={{
                flex: "0 0 25%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between", // distribuye de arriba a abajo
                alignItems: "stretch",           // que ocupen 100% horizontal
                width: "100%",
                height: "100%",
                gap: 2 * scale, // espacio entre inputs si quieres
              }}
            >
              <Box sx={{ display: "flex", alignItems: "flex-end", flex: 1 }}>
                <MobileFriendly sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
                <TextField
                  label="Número Celular"
                  value={phone}
                  variant="standard"
                  fullWidth
                  inputRef={phoneRef}
                  onFocus={() => setActiveInput("phone")}
                  InputProps={{ readOnly: true }}
                  error={errorsEmpty.phone}
                  helperText={errorsEmpty.phone ? msgPhone : ""}
                  sx={{
                    backgroundColor: activeInput === "phone" ? "#dce1f5ff" : "transparent",
                    borderRadius: 2 * scale,
                    transition: "background-color 0.3s ease",
                  }}
                />
              </Box>

              <Box sx={{ display: "flex", alignItems: "flex-end", flex: 1 }}>
                <Password sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
                <TextField
                  label={`Contraseña (${config?.paramsHtml?.lenMaxInputPass} dígitos)`}
                  value={password}
                  variant="standard"
                  fullWidth
                  type="password"
                  inputMode="numeric"
                  inputRef={passRef}
                  onFocus={() => setActiveInput("password")}
                  InputProps={{ readOnly: true }}
                  error={errorsEmpty.password}
                  helperText={errorsEmpty.password ? msgPass : ""}
                  sx={{
                    backgroundColor: activeInput === "password" ? "#dce1f5ff" : "transparent",
                    borderRadius: 2 * scale,
                    transition: "background-color 0.3s ease",
                  }}
                />
              </Box>

              {!operationRet && (
                <Box sx={{ display: "flex", alignItems: "flex-end", flex: 1 }}>
                  <Refresh sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
                  <TextField
                    label="Confirmar Contraseña"
                    value={confirmPassword}
                    variant="standard"
                    fullWidth
                    type="password"
                    inputMode="numeric"
                    inputRef={confirmRef}
                    onFocus={() => setActiveInput("confirmPassword")}
                    InputProps={{ readOnly: true }}
                    error={errorsEmpty.confirmPassword}
                    helperText={errorsEmpty.confirmPassword ? msgConfPass : ""}
                    sx={{
                      backgroundColor: activeInput === "confirmPassword" ? "#dce1f5ff" : "transparent",
                      borderRadius: 2 * scale,
                      transition: "background-color 0.3s ease",
                    }}
                  />
                </Box>
              )}
            </Box>

            {/* Sección Botones - 75% */}
            <Box
              sx={{
                flex: "0 0 65%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Grid
                container
                spacing={1 * scale}
                sx={{ mt: 4 * scale, height: "100%" }}
              >
                {keys().map(renderButton)}
              </Grid>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <SnackBarAlert
        open={snackbarOpen}
        message={snackbarMessage}
        severity={snackbarSeverity}
        onClose={() => setSnackbarOpen(false)}
      />

      <ConfirmDialog
        open={confirmDialogOpen}
        onConfirm={confirmSendData}
        onCancel={cancelConfirmation}
        tittle={'Confirmar'}
        mesg={`¡Vas a ${operation}! ${config?.sendSMS ? '\nRecibirás un mensaje de texto con los datos ingresados.' : ''} \n¿El número celular es correcto?`}
        phone={formatNumberPhone(phone)}
        isPhone={true}
        hideBackdrop    // 👈 evita que bloquee clicks
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
        hideBackdrop    // 👈 evita que bloquee clicks
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      <ShowLocker
        open={showLockerOpen}
        onConfirm={confirmAssignLocker}
        locker={locker}
        title={'Tu casillero es el:'}
        msg={
          operation !== 'Reservado' ? (operationRet ? 'Retira' : 'Guarda') + ' tus pertenencias, gracias por utilizar nuestro servicio' : 'gracias por utilizar nuestro servicio'
        }
        timeout={timeoutShowMessage}
        backColor={operation === 'Retirar' ? 'primary.main' : operation === 'Guardar' ? 'error.main' : 'secondary.main'}
        operation={operation}
        hideBackdrop    // 👈 evita que bloquee clicks
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      <ShowErrorAPI
        open={showErrorAPIOpen}
        onConfirm={confirmShowErrorAPI}
        msg={messageErrorAPI}
        timeout={timeoutShowMessage}
        hideBackdrop    // 👈 evita que bloquee clicks
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      {loading && (<LoadingScreen
        message={messageLoading}
      />)}
    </>
  );
}
