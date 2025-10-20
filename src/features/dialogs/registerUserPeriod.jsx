import { useState, useRef, forwardRef, useEffect } from 'react';
import {
  Person,
  Article,
  LowPriority,
  Event,
  Close,
  DoneAll,
  MobileFriendly,
  Discount,
  AttachMoney,
  Email,
  Today,
} from '@mui/icons-material';
import {
  Button,
  InputLabel,
  Select,
  MenuItem,
  FormControl,
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  Slide,
} from '@mui/material';
import SnackBarAlert from '../bar/snackAlert.jsx';
import ConfirmDialog from './confirmDialog.jsx';
import ShowErrorAPI from './showErrorAPI.jsx';
import LoadingScreen from './loading.jsx';
import {
  phoneRegex,
  formatCurrency,
  emailRegex,
  formatNumberPhone
} from '../utils/utils.js';
import { useElectronConfig } from '../hooks/useConfig.js';
import { useWindowSizeContext } from '../context/windowSizeContext.jsx'; // Hook para tamaño pantalla
import { scaledDimension } from '../utils/scaledDimension.js';
import { useModal } from "../context/modalContext.jsx";
import TextFieldVirtKeyPad from '../utils/textFieldVirtKeyPad.jsx';
import DateTime from "../utils/dateTime.jsx"; // tu componente personalizado
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import Reserve from '../apis/reserve.js';
import ShowLocker from './showLocker.jsx';
dayjs.extend(utc);

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

// Logging centralizado
const log = (level, message) => {
  if (typeof window !== 'undefined' && window.electronAPI?.log) {
    window.electronAPI.log(level, `[${fileName}] ${message}`);
  }
};

const fileName = 'registerUserPeriod';

export default function RegisterUserPeriod({
  open,
  onClose
}) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [errorsEmpty, setErrorsEmpty] = useState({
    nameUser: false,
    idNumber: false,
    phone: false,
    period: false,
    startDate: false,
  });
  const [messageErrorAPI, setMessageErrorAPI] = useState('');
  const [loading, setLoading] = useState(false);
  const [messageLoading, setMessageLoading] = useState();
  const [timeoutShowMessage, setTimeoutShowMessage] = useState();
  const [endDate, setEndDate] = useState(dayjs());
  const [startDate, setStartDate] = useState(dayjs());
  const [amount, setAmount] = useState(0);
  const [porcentage, setPorcentage] = useState(0);

  const {
    nameUser, setNameUser,
    idNumber, setIdNumber,
    phone, setPhone,
    period, setPeriod,
    email, setEmail,
    locker, setLocker,
    confirmDialogOpen, setConfirmDialogOpen,
    showErrorAPIOpen, setShowErrorAPIOpen,
    showLockerOpen, setShowLockerOpen,
  } = useModal();

  // Refs para cambiar el foco
  const size = useWindowSizeContext();
  const scale = size.factor || 1; // de tu hook useElectronScreenData()
  const cleanupRef = useRef(null);
  const config = useElectronConfig();

  useEffect(() => {
    if (!config) return;

    if (config?.paramsHtml?.modalTimeouts?.timeoutShowMessage) {
      setTimeoutShowMessage(config?.paramsHtml?.modalTimeouts?.timeoutShowMessage);
    }

  }, [config]);

  useEffect(() => {
    if (open) {

      // 👇 si no hay startDate válido, arrancar con hoy
      if (!startDate || !dayjs(startDate).isValid()) {
        const today = dayjs();
        setStartDate(today);
        setEndDate(today.add(1, "month").subtract(1, "day")); // 👈 calcula fin de mes de inmediato
      }

      // 👇 si ya hay fecha pero periodo es mensual, asegurar cálculo
      if (period === "Mensual" && startDate) {
        setEndDate(dayjs(startDate).add(1, "month").subtract(1, "day"));
      }
    }
  }, [open]);

  // Cuando cambia startDate o period, recalculamos endDate
  useEffect(() => {
    if (!startDate || !config) return;

    let newEndDate;

    if (period === "Semanal") { // Semanal
      newEndDate = dayjs(startDate).add(6, "day"); // inicio + 6 días
      setAmount(
        Math.round(config?.paramsHtml?.currency?.coinBoxRequiredAmount * 7 * (1 - (config?.reserve?.porcentWeekly / 100)))
      );
      setPorcentage(config?.reserve?.porcentWeekly);
    } else if (period === "Quincenal") { // Quincenal
      newEndDate = dayjs(startDate).add(14, "day"); // inicio + 14 días
      setAmount(
        Math.round(config?.paramsHtml?.currency?.coinBoxRequiredAmount * 15 * (1 - (config?.reserve?.porcentFortnightly / 100)))
      );
      setPorcentage(config?.reserve?.porcentFortnightly);
    } else if (period === "Mensual") {
      newEndDate = dayjs(startDate)
        .add(1, "month")   // vas al mismo día del mes siguiente
        .subtract(1, "day"); // le restas 1 día
      setAmount(
        Math.round(config?.paramsHtml?.currency?.coinBoxRequiredAmount * 30 * (1 - (config?.reserve?.porcentMonthly / 100)))
      );
      setPorcentage(config?.reserve?.porcentMonthly);
    }
    setEndDate(newEndDate);
  }, [startDate, period, config]); // se ejecuta al cambiar inicio o periodo


  const clearInputs = () => {
    if (cleanupRef.current) cleanupRef.current();
    setNameUser('');
    setIdNumber('');
    setPhone('');
    setEmail('');
    setPeriod("Mensual"); // 👈 vuelve siempre a Mensual
    const today = dayjs();
    setStartDate(today);
    setEndDate(today.endOf("month"));
    // setErrorsEmpty({ phone: false, password: false, confirmPassword: false });
    // cancelConfirmation();
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

  const validateAllInputs = () => {
    let hasError = false;
    const errores = [];

    // Nombres completos
    const trimmedName = nameUser.trim();
    if (!trimmedName) {
      errores.push("Los nombres son obligatorios");
      setErrorsEmpty(prev => ({ ...prev, nameUser: true }));
      hasError = true;
    } else if (trimmedName.length > 50) {
      errores.push("Los nombres no deben superar los 50 caracteres");
      setErrorsEmpty(prev => ({ ...prev, nameUser: true }));
      hasError = true;
    } else {
      setErrorsEmpty(prev => ({ ...prev, nameUser: false }));
    }

    // Número de identificación
    const trimmedId = idNumber.trim();
    if (!trimmedId) {
      errores.push("El número de identificación es obligatorio");
      setErrorsEmpty(prev => ({ ...prev, idNumber: true }));
      hasError = true;
    } else if (trimmedId.length > 20) {
      errores.push("El número de identificación no debe superar los 20 caracteres");
      setErrorsEmpty(prev => ({ ...prev, idNumber: true }));
      hasError = true;
    } else if (trimmedId.length < 6) {
      errores.push("El número de identificación no debe ser inferior a los 6 caracteres");
      setErrorsEmpty(prev => ({ ...prev, idNumber: true }));
      hasError = true;
    } else {
      setErrorsEmpty(prev => ({ ...prev, idNumber: false }));
    }

    // Correo electrónico
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errores.push("El correo electrónico es obligatorio");
      setErrorsEmpty(prev => ({ ...prev, email: true }));
      hasError = true;
    } else if (trimmedEmail.length > 50) {
      errores.push("El correo electrónico no debe superar los 50 caracteres");
      setErrorsEmpty(prev => ({ ...prev, email: true }));
      hasError = true;
    } else if (!emailRegex.test(trimmedEmail)) {
      errores.push("Correo electrónico inválido");
      setErrorsEmpty(prev => ({ ...prev, email: true }));
      hasError = true;
    } else {
      setErrorsEmpty(prev => ({ ...prev, email: false }));
    }

    // Número celular

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errores.push("El número celiular es obligatorio");
      setErrorsEmpty(prev => ({ ...prev, phone: true }));
      hasError = true;
    } else if (trimmedPhone.length > 10) {
      errores.push("El número celular no debe superar los 10 caracteres");
      setErrorsEmpty(prev => ({ ...prev, phone: true }));
      hasError = true;
    } else if (!phoneRegex.test(trimmedPhone)) {
      errores.push("Número celular inválido");
      setErrorsEmpty(prev => ({ ...prev, phone: true }));
      hasError = true;
    } else {
      setErrorsEmpty(prev => ({ ...prev, phone: false }));
    }

    // Mostrar errores en snackbar si los hay
    if (errores.length > 0) {
      const msg = errores.join(" | ");
      log("warn", `Errores de validación: ${msg}`);
      showAlert(msg, "error");
    }

    return !hasError; // true si todo válido
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const allValid = validateAllInputs();
    if (allValid) {
      setConfirmDialogOpen(true); // Mostrar el diálogo de confirmación
    }
  }

  const confirmShowErrorAPI = () => {
    setShowErrorAPIOpen(false);
  };

  const confirmAssignLocker = () => {
    setShowLockerOpen(false);
    setConfirmDialogOpen(false);
    cancel();
  };

  const cancelConfirmation = () => {
    setConfirmDialogOpen(false);
  };

  const confirmSendData = async () => {

    setLoading(false);
    setMessageLoading('Registrando Usuario...');

    const payload = {
      nameUser,
      idNumber,
      email,
      phone,
      period,
      startDate: dayjs(startDate).format("YYYY-MM-DD"),
      endDate: dayjs(endDate).format("YYYY-MM-DD"),
      amount,
      porcentage
    }

    try {
      setLoading(true);

      const result = await Reserve(payload);

      if (result?.success) {

        const lockerCode = result?.data?.lockerCode || result?.http?.data?.lockerCode || '';
        if (lockerCode) {
          setLocker(lockerCode)
          setShowLockerOpen(true);
        } else {
          setMessageErrorAPI('No se recibió código de casillero');
          setShowErrorAPIOpen(true);
        }
      } else {
        if (result?.status === 500) {
          setMessageErrorAPI('No se pudo registrar usuario, ¡Inténtalo nuevamente!');
        } else {
          setMessageErrorAPI(result?.data?.message || 'No se pudo registrar usuario, ¡Inténtalo nuevamente!');
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
    setLoading(false);
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => { }}
        keepMounted={false}
        component="form"
        onSubmit={handleSubmit}
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
            // minHeight: '80%',
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
              Registrar usuario
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
            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: '100%' }}>
              <Person sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Nombres y apellidos"
                value={nameUser}
                setValue={setNameUser}
                error={errorsEmpty.nameUser}
                helperText={errorsEmpty.nameUser ? "Ingresa los nombres completos" : ""}
                inputProps={{ maxLength: 50 }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: '100%' }}>
              <Article sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Número de identificación"
                value={idNumber}
                setValue={setIdNumber}
                error={errorsEmpty.idNumber}
                helperText={errorsEmpty.idNumber ? "Ingresa el número de identificación" : ""}
                inputProps={{ maxLength: 20 }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: '100%' }}>
              <Email sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Correo electrónico"
                value={email}
                setValue={setEmail}
                error={errorsEmpty.email}
                helperText={errorsEmpty.email ? "Ingresa el correo electrónico" : ""}
                inputProps={{ maxLength: 50 }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <MobileFriendly sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Número celular"
                value={phone}
                setValue={setPhone}
                error={errorsEmpty.phone}
                helperText={errorsEmpty.phone ? "Ingresa el número celular" : ""}
                inputProps={{ maxLength: 10 }}
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <LowPriority sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <FormControl variant="standard" fullWidth>
                <InputLabel id="period-select-label">Periodo de reserva</InputLabel>
                <Select
                  labelId="period-select-label"
                  value={period}
                  defaultValue={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  sx={{
                    fontSize: `${32 * scale}px`,
                    fontWeight: "bold",
                    color: "#009640",
                  }}
                >
                  <MenuItem value="Semanal">Semanal</MenuItem>
                  <MenuItem value="Quincenal">Quincenal</MenuItem>
                  <MenuItem value="Mensual">Mensual</MenuItem>
                </Select>
              </FormControl>
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <Today sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Fecha de inicialización"
                value={startDate?.format("YYYY-MM-DD")}
                setValue={setStartDate}
                disabled
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <Event sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Fecha de finalización"
                value={endDate?.format("YYYY-MM-DD")}
                setValue={setEndDate}
                disabled
              />
            </Box>

            {/* <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "flex-end",
                width: "100%",
                gap: 2 * scale,
                my: 5 * scale,
              }}
            >
              <Box sx={{ width: "calc(50% - 8px)" }}>
                <DateTime
                  label="Fecha de inicio"
                  value={startDate}
                  onChange={setStartDate}
                  showTime={false}
                  disablePastDates={true}
                />
              </Box>

              <Box sx={{ width: "calc(50% - 8px)" }}>
                <DateTime
                  label="Fecha de finalización"
                  value={endDate}
                  onChange={setEndDate}
                  showTime={false}
                  disabled
                />
              </Box>
            </Box> */}

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <AttachMoney sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Valor a pagar"
                value={formatCurrency(amount)}
                setValue={setAmount}
                disabled
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <Discount sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Descuento (%)"
                value={porcentage}
                setValue={setPorcentage}
                disabled
              />
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2 * scale,         // separación entre botones
                width: "100%",
                pt: 4 * scale,
              }}
            >
              <Button
                variant="contained"
                color="secondary"
                onClick={cancel}
                sx={{ flex: 1 }}        // 👈 ocupa la mitad
              >
                Cancelar
                <Close sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
              </Button>

              <Button
                variant="contained"
                color="success"
                type="submit"
                sx={{ flex: 1 }}        // 👈 ocupa la otra mitad
              >
                Registrar
                <DoneAll sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
              </Button>
            </Box>

          </Box>
        </DialogContent>
      </Dialog >

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
        items={[
          { label: "Nombre completo", value: nameUser },
          { label: "Identificación", value: formatCurrency(idNumber, { onlyThousands: true }) },
          { label: "Correo electrónico", value: email },
          { label: "Celular", value: formatNumberPhone(phone) },
          { label: "Periodo", value: period },
          { label: "Fecha inicio", value: startDate?.format("YYYY-MM-DD") },
          { label: "Fecha fin", value: endDate?.format("YYYY-MM-DD") },
          { label: "Valor a pagar", value: formatCurrency(amount) },
          { label: "Descuento (%)", value: porcentage },
          { label: "Nota", value: config?.sendSMS ? '¡Se enviará mensaje de texto al usuario!' : '' },
        ]}
        isPhone={false}
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

      <ShowLocker
        open={showLockerOpen}
        onConfirm={confirmAssignLocker}
        locker={locker}
        title={'Casillero reservado:'}
        msg={'Datos registrados exitosamente'}
        timeout={timeoutShowMessage}
        backColor={'info.main'}
        hideBackdrop    // 👈 evita que bloquee clicks
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      {
        loading && (<LoadingScreen
          message={messageLoading}
        />)
      }
    </>
  );
}
