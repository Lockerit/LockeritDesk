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
import AssignLocker from './assignLocker.jsx';
import ShowErrorAPI from './showErrorAPI.jsx';
import { paymentService } from '../apis/addAssignLocker.js';
import LoadingScreen from '../dialogs/loading.jsx';
import OpenLocker from '../apis/openLocke.js';
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

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const fileName = 'keypad';

export default function KeyPadModal({ open, onClose, operation, timeout = 600 }) {
  const [activeInput, setActiveInput] = useState('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [insertMoneyOpen, setInsertMoneyOpen] = useState(false);
  const [assignLockerOpen, setAssignLockerOpen] = useState(false);
  const [showErrorAPIOpen, setShowErrorAPIOpen] = useState(false);
  const [amountPay, setAmountPay] = useState(0);
  const [amountService, setAmountService] = useState('');
  const [messageErrorAPI, setMessageErrorAPI] = useState('');
  const [locker, setLocker] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(timeout);
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState();
  const [timeoutInsert, setTimeoutInsert] = useState();
  const [timeoutShowMessage, setTimeoutShowMessage] = useState();

  // Refs para cambiar el foco
  const phoneRef = useRef(null);
  const passRef = useRef(null);
  const confirmRef = useRef(null);
  const cleanupRef = useRef(null);
  const config = useElectronConfig();


  const operationRet = operation === 'Retirar' ? true : false;
  const isConfigReady = config && Object.keys(config).length > 0;

  useEffect(() => {
    if (open) {
      setSecondsLeft(timeout); // reinicia cada vez que abre
    }
  }, [open]);

  useEffect(() => {

    if (open && secondsLeft > 0) {
      const interval = setInterval(() => {
        setSecondsLeft(prev => prev - 1);
      }, 1000);

      return () => clearInterval(interval);
    } else if (open && secondsLeft === 0) {
      onClose(); // cerrar automáticamente
    }
  }, [open, secondsLeft]);

  useEffect(() => {
    if (!isConfigReady) return;

    const rawAmount = config?.params?.currency?.amountService;

    if (rawAmount != null && !isNaN(Number(rawAmount))) {
      setAmountService(formatCurrency(rawAmount));
    } else {
      setAmountService('0'); // o '', o lo que desees mostrar si no hay valor
    }

    if (config?.params?.modalTimeouts?.timeoutKeypad) {
      setTimeoutInsert(config?.params?.modalTimeouts?.timeoutInsertMoney);
      setTimeoutShowMessage(config?.params?.modalTimeouts?.timeoutShowMessage);
    }
  }, [config])

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
    if (activeInput !== 'phone' && current.length >= config?.params.lenMaxInputPass) return;
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
      const invalidFormat = !phoneRegex().test(trimmedPhone);
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
      } else if ((password.length < config?.params?.lenMinInputPass) || (password.length > config?.params?.lenMaxInputPass)) {
        const msg = `La contraseña debe tener ${config?.params?.lenMaxInputPass} dígitos.`;
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
        } else if ((confirmPassword.length < config?.params?.lenMinInputPass) || (confirmPassword.length > config?.params?.lenMaxInputPass)) {
          const msg = `La contraseña debe tener ${config?.params?.lenMaxInputPass} dígitos.`;
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
    const phoneInvalid = trimmedPhone === '' || !phoneRegex().test(trimmedPhone);
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
    const passInvalid = password.trim() === '' || (password.length < config?.params?.lenMinInputPass) || (password.length > config?.params?.lenMaxInputPass);
    if (passInvalid) {
      const msg = password.trim() === '' ? 'Ingresa la contraseña.' : `La contraseña debe tener ${config?.params?.lenMaxInputPass} dígitos.`;
      setMsgPass(msg);
      setErrorsEmpty(prev => ({ ...prev, password: true }));
      showAlert(msg, 'error');
      hasError = true;
    } else {
      setErrorsEmpty(prev => ({ ...prev, password: false }));
    }

    if (!operationRet) {
      // Validación confirmación contraseña
      const confInvalid = confirmPassword.trim() === '' || password !== confirmPassword || (confirmPassword.length < config?.params?.lenMinInputPass) || (confirmPassword.length > config?.params?.lenMaxInputPass);
      if (confInvalid) {
        let msg = '';
        if (confirmPassword.trim() === '') msg = 'Confirma la contraseña.';
        else if (password !== confirmPassword) msg = 'Las contraseñas no coinciden.';
        else msg = `La contraseña debe tener ${config?.params?.lenMaxInputPass} dígitos.`;
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

    if (!operationRet) {
      setMessageLoading('Asignando Casilllero...');
      setConfirmDialogOpen(true); // Mostrar confirmación
    } else {
      setMessageLoading('Buscando Casilllero...');
      setSecondsLeft(timeout);
      const payload = { phone, password }

      try {
        setLoading(true);

        const result = await OpenLocker(payload);

        if (result?.success) {
          console.log();
          setLocker(result.data.lockerCode); // ejemplo
          setAssignLockerOpen(true);
        } else {
          setMessageErrorAPI(result?.error.message || '[keypad] Error en el servidor HTTP');
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

    // clearInputs();
    // onClose(); // o pasa los datos al padre
  };

  const clearInputs = () => {
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setLocker('');
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

    const payload = { phone, password }
    setInsertMoneyOpen(true);

    try {
      // se recibe el timeout y se multiplica po 1000 (milisegundos) y después por la cantidad máxima de monedas que pueden ingresar
      const result = await paymentService(payload, (timeoutInsert * 1000 * 10), handleTotalUpdate, handleLoadingChange);

      if (result?.http?.success) {
        setLocker(result.http.data.lockerCode); // ejemplo
        setAssignLockerOpen(true);
      } else {
        setMessageErrorAPI(result?.error.message || '[keypad] Error en el servidor HTTP');
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
  };

  const focusCloseModal = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = document.querySelector('#confirmar-keypad');
        if (el && typeof el.focus === 'function') {
          el.focus();
        }
      });
    });
  }

  const cancelConfirmation = () => {
    setConfirmDialogOpen(false);
    // Da tiempo a que Material UI limpie aria-hidden
    setTimeout(() => {
      focusCloseModal();   // hace focus al botón del modal padre
    }, 100); // 100ms suele ser suficiente para animaciones y limpieza
  };


  const cancelInsertMoney = () => {
    if (cleanupRef.current) cleanupRef.current();
    setAmountPay(0);
    setInsertMoneyOpen(false);
    closeWebSocket();
    // Da tiempo a que Material UI limpie aria-hidden
    setTimeout(() => {
      focusCloseModal();   // hace focus al botón del modal padre
    }, 100); // 100ms suele ser suficiente para animaciones y limpieza
  };

  const confirmAssignLocker = () => {
    setAssignLockerOpen(false);
    clearInputs();
    closeWebSocket();
    onClose();
    // Da tiempo a que Material UI limpie aria-hidden
    setTimeout(() => {
      focusCloseModal();   // hace focus al botón del modal padre
    }, 100); // 100ms suele ser suficiente para animaciones y limpieza
  };

  const confirmShowErrorAPI = () => {
    setShowErrorAPIOpen(false);
    clearInputs();
    closeWebSocket();
    onClose();
    // Da tiempo a que Material UI limpie aria-hidden
    setTimeout(() => {
      focusCloseModal();   // hace focus al botón del modal padre
    }, 100); // 100ms suele ser suficiente para animaciones y limpieza
  };

  const renderButton = (value) => {
    const commonProps = {
      variant: 'contained',
      // size: 'large',
      sx: { width: '100%', height: '100%', fontSize: '32px' }
    };
    const gridSize = value === 'Aceptar' ? 12 : 4;

    if (value === 'Aceptar') {
      const isFinalStep = (!operationRet && (activeInput === 'confirmPassword')) || (operationRet && (activeInput === 'password'));
      return (
        <Grid size={gridSize} key={value} >
          <Button
            {...commonProps}
            color="success"
            onClick={handleNextOrAccept}
            id="confirmar-keypad"
          >
            {isFinalStep ? 'Aceptar' : 'Siguiente'}
            {isFinalStep
              ? <DoneAll sx={{ fontSize: 40, ml: 1 }} />
              : <ArrowForwardIos sx={{ fontSize: 40, ml: 1 }} />}
          </Button>
        </Grid>
      );
    }

    const icon = {
      'Borrar': <Backspace sx={{ fontSize: 40, ml: 1 }} />,
      'Cancelar': <Close sx={{ fontSize: 40, ml: 1 }} />,
    }[value];

    const handler = {
      'Borrar': removeDigit,
      'Cancelar': cancel,
    }[value] || (() => addDigit(value));

    const color = {
      'Borrar': 'warning',
      'Cancelar': 'error',
    }[value] || 'secondary';

    return (
      <Grid size={gridSize} key={value}>
        <Button {...commonProps} color={color} onClick={handler}>
          {value}{icon}
        </Button>
      </Grid>
    );
  };


  return (
    <>
      <Dialog
        open={open}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
            cancel(); // tu función personalizada para cerrar
          }
        }}
        PaperProps={{
          sx: {
            width: '50vw',
            maxWidth: 'none',
            height: '100vh'
          }
        }}
        slots={{
          transition: Transition,
        }}
        disableEnforceFocus
        disableAutoFocus
        disableEscapeKeyDown
        disableRestoreFocus
      >

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'relative' }}>
          {/* Encabezado superior: tiempo y botón cerrar */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 1,
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <Typography variant="body2">
              {formatTime(secondsLeft)}
            </Typography>
            <IconButton onClick={cancel}>
              <Close />
            </IconButton>
          </Box>

          {/* Texto centrado */}
          <Typography
            variant="h3"
            sx={{ fontWeight: 'bold', textAlign: 'center', mt: 6 }} // mt para evitar superposición
          >
            {operation}
          </Typography>
        </Box>


        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: '25vh' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <MobileFriendly sx={{ mr: 2, fontSize: 40 }} />
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
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Password sx={{ mr: 2, fontSize: 40 }} />
              <TextField
                label={`Contraseña (${config?.params?.lenMaxInputPass} dígitos)`}
                value={password}
                variant="standard"
                fullWidth
                type='password'
                inputMode='numeric'
                inputRef={passRef}
                onFocus={() => setActiveInput('password')}
                InputProps={{ readOnly: true }}
                error={errorsEmpty.password}
                helperText={errorsEmpty.password ? msgPass : ''}
              />
            </Box>

            {!operationRet && (<Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
              <Refresh sx={{ mr: 2, fontSize: 40 }} />
              <TextField
                label="Confirmar Contraseña"
                value={confirmPassword}
                variant="standard"
                fullWidth
                type='password'
                inputMode='numeric'
                inputRef={confirmRef}
                onFocus={() => setActiveInput('confirmPassword')}
                InputProps={{ readOnly: true }}
                error={errorsEmpty.confirmPassword}
                helperText={errorsEmpty.confirmPassword ? msgConfPass : ''}
              />
            </Box>
            )}
          </Box>

          <Box sx={{ height: '50vh' }}>
            <Grid container spacing={2} sx={{ mt: 4, height: '1' }}>
              {keys().map(renderButton)}
            </Grid>
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
        TransitionProps={{
          onExited: () => {
            focusCloseModal(); // garantizado que ya terminó la transición
          }
        }}
        tittle={'Confirmar'}
        mesg={'¡Vas a ' + operation + '!\n¿El número celular es correcto?'}
        phone={formatNumberPhone(phone)}
        isPhone={true}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus

      />

      <InsertMoney
        open={insertMoneyOpen}
        onCancel={cancelInsertMoney}
        TransitionProps={{
          onExited: () => {
            focusCloseModal(); // garantizado que ya terminó la transición
          }
        }}
        amountService={amountService}
        amountPay={formatCurrency(amountPay)}
        timeout={timeoutInsert}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      <AssignLocker
        open={assignLockerOpen}
        onConfirm={confirmAssignLocker}
        TransitionProps={{
          onExited: () => {
            focusCloseModal(); // garantizado que ya terminó la transición
          }
        }}
        locker={locker}
        msg={(operationRet ? 'Retira' : 'Guarda') + ' tus pertenencias, gracias por utilizar nuestro servicio'}
        timeout={timeoutShowMessage}
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      <ShowErrorAPI
        open={showErrorAPIOpen}
        onConfirm={confirmShowErrorAPI}
        TransitionProps={{
          onExited: () => {
            focusCloseModal(); // garantizado que ya terminó la transición
          }
        }}
        msg={messageErrorAPI}
        timeout={timeoutShowMessage}
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
