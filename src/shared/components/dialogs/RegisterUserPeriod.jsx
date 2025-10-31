import {
  Person, Article, LowPriority, Event, Close, DoneAll, MobileFriendly, Discount, AttachMoney, Email, Today
} from '@mui/icons-material';
import {
  Button, InputLabel, Select, MenuItem, FormControl, Box, Typography, Dialog, DialogContent, IconButton, Slide
} from '@mui/material';
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { useState, useRef, forwardRef, useEffect } from 'react';

import { Reserve } from '@services/apis/reserve.js';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { TextFieldVirtKeyPad } from '@shared/components/inputs/TextFieldVirtKeyPad.jsx';
import { useModal } from "@shared/context/ModalContext.jsx";
import { useWindowSizeContext } from '@shared/context/WindowSizeContext.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { scaledDimension } from '@shared/utils/scaledDimension.js';
import { phoneRegex, formatCurrency, emailRegex, formatNumberPhone } from '@shared/utils/utils.js';
import { logger } from '@shared/utils/logger.js';

import { ConfirmDialog } from './ConfirmDialog.jsx';
import { Loading } from './Loading.jsx';
import { ShowErrorAPI } from './ShowErrorAPI.jsx';
import { ShowLocker } from './ShowLocker.jsx';

dayjs.extend(utc);

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const log = logger.scope('RegisterUserPeriod');

export const RegisterUserPeriod = ({ open, onClose }) => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');
  const [errorsEmpty, setErrorsEmpty] = useState({
    nameUser: false,
    idNumber: false,
    email: false,
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

  const size = useWindowSizeContext();
  const scale = size.factor || 1;
  const cleanupRef = useRef(null);
  const config = useElectronConfig();

  // Montaje/desmontaje
  useEffect(() => {
    log.info('Montando RegisterUserPeriod');
    return () => log.info('Desmontando RegisterUserPeriod');
  }, []);

  // Carga de config
  useEffect(() => {
    if (!config) return;
    const t = config?.paramsHtml?.modalTimeouts?.timeoutShowMessage;
    if (t) {
      setTimeoutShowMessage(t);
      log.info(`Config cargado, { timeoutShowMessage: ${t} }`);
    }
  }, [config]);

  // Reacción a open/period/startDate
  useEffect(() => {
    log.debug('props', { open, period, startDate: startDate?.format?.('YYYY-MM-DD') });
    if (!open) return;

    if (!startDate || !dayjs(startDate).isValid()) {
      const today = dayjs();
      setStartDate(today);
      setEndDate(today.add(1, "month").subtract(1, "day"));
      log.info(`startDate, { start: ${today.format('YYYY-MM-DD')} }`);
    }
    if (period === "Mensual" && startDate) {
      const end = dayjs(startDate).add(1, "month").subtract(1, "day");
      setEndDate(end);
      log.debug(`Mensual, { start: ${startDate.format('YYYY-MM-DD')}, end: ${end.format('YYYY-MM-DD')} }`);
    }
  }, [open, period, startDate]);

  // Recalcular fin/valor/porcentaje ante cambios
  useEffect(() => {
    if (!startDate || !config) return;

    let newEndDate;
    if (period === "Semanal") {
      newEndDate = dayjs(startDate).add(6, "day");
      const val = Math.round(config?.paramsHtml?.currency?.coinBoxRequiredAmount * 7 * (1 - (config?.reserve?.porcentWeekly / 100)));
      setAmount(val);
      setPorcentage(config?.reserve?.porcentWeekly);
      setEndDate(newEndDate);
      log.info(`Recalculo semanal, { start: ${startDate.format('YYYY-MM-DD')}, end: ${newEndDate.format('YYYY-MM-DD')}, amount: ${val}, pct: ${config?.reserve?.porcentWeekly} }`);
    } else if (period === "Quincenal") {
      newEndDate = dayjs(startDate).add(14, "day");
      const val = Math.round(config?.paramsHtml?.currency?.coinBoxRequiredAmount * 15 * (1 - (config?.reserve?.porcentFortnightly / 100)));
      setAmount(val);
      setPorcentage(config?.reserve?.porcentFortnightly);
      setEndDate(newEndDate);
      log.info(`Recalculo quincenal, { start: ${startDate.format('YYYY-MM-DD')}, end: ${newEndDate.format('YYYY-MM-DD')}, amount: ${val}, pct: ${config?.reserve?.porcentFortnightly} }`);
    } else if (period === "Mensual") {
      newEndDate = dayjs(startDate).add(1, "month").subtract(1, "day");
      const val = Math.round(config?.paramsHtml?.currency?.coinBoxRequiredAmount * 30 * (1 - (config?.reserve?.porcentMonthly / 100)));
      setAmount(val);
      setPorcentage(config?.reserve?.porcentMonthly);
      setEndDate(newEndDate);
      log.info(`Recalculo mensual, { start: ${startDate.format('YYYY-MM-DD')}, end: ${newEndDate.format('YYYY-MM-DD')}, amount: ${val}, pct: ${config?.reserve?.porcentMonthly} }`);
    }
  }, [startDate, period, config]);

  const clearInputs = () => {
    if (cleanupRef.current) cleanupRef.current();
    setNameUser('');
    setIdNumber('');
    setPhone('');
    setEmail('');
    setPeriod("Mensual");
    const today = dayjs();
    setStartDate(today);
    setEndDate(today.endOf("month"));
    setErrorsEmpty({
      nameUser: false,
      idNumber: false,
      email: false,
      phone: false,
      period: false,
      startDate: false,
    });
    log.debug('Limpiando inputs');
  };

  const cancel = () => {
    log.info('Cancelando y cerrando dialog');
    clearInputs();
    onClose?.();
  };

  const showAlert = (msg, severity = 'error') => {
    setSnackbarMessage(msg);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
    log.warn(`Alerta, { severity: ${severity}, msg: ${msg} }`);
  };

  const validateAllInputs = () => {
    let hasError = false;
    const errores = [];

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

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errores.push("El número celular es obligatorio");
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

    if (errores.length > 0) {
      showAlert(errores.join(" | "), "error");
      log.warn(`Validación fallida, { count: ${errores.length} }`);
    } else {
      log.info(`Validación exitosa`);
    }
    return !hasError;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    log.info('Iniciando Petición de registro de usuario');
    if (validateAllInputs()) {
      setConfirmDialogOpen(true);
      log.info('Confirmando Petición de registro de usuario');
    }
  };

  const confirmShowErrorAPI = () => {
    setShowErrorAPIOpen(false);
    log.info('Cerrando error API dialog');
  };

  const confirmAssignLocker = () => {
    setShowLockerOpen(false);
    setConfirmDialogOpen(false);
    log.info('Cerrando locker dialog');
    cancel();
  };

  const cancelConfirmation = () => {
    setConfirmDialogOpen(false);
    log.info('Cerrando confirm dialog');
  };

  const confirmSendData = async () => {
    setMessageLoading('Registrando Usuario...');
    setLoading(true);

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
    };

    log.info(`Reserva solicitada, { period: {${period}}, startDate: ${payload.startDate}, endDate: ${payload.endDate}, amount: ${amount}, porcentage: ${porcentage} }`);

    try {
      const result = await Reserve(payload);

      if (result?.success) {
        const lockerCode = result?.data?.lockerCode || result?.http?.data?.lockerCode || '';
        log.info('reserve.call.success', { lockerCode: lockerCode || 'n/a' });

        if (lockerCode) {
          setLocker(lockerCode);
          setShowLockerOpen(true);
          log.info(`Reserva exitosa, { lockerCode: ${lockerCode} }`);
        } else {
          setMessageErrorAPI('No se recibió código de casillero');
          setShowErrorAPIOpen(true);
          log.warn(`Reserva fallida, { reason: No se recibió código de casillero }`);
        }
      } else {
        const msg = result?.status === 500
          ? 'No se pudo registrar usuario, ¡Inténtalo nuevamente!'
          : (result?.data?.message || 'No se pudo registrar usuario, ¡Inténtalo nuevamente!');
        setMessageErrorAPI(msg);
        setShowErrorAPIOpen(true);
        log.error(`Reserva fallida, { status: ${result?.status}, msg: ${msg} }`);
      }
    } catch (error) {
      const msg = String(error);
      setMessageErrorAPI(msg);
      setShowErrorAPIOpen(true);
      log.error(`Reserva fallida, { msg: ${msg} }`);
    } finally {
      setLoading(false);
      log.info('Reserva finalizada');
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={() => { }}
        keepMounted={false}
        component="form"
        onSubmit={handleSubmit}
        hideBackdrop
        disableEscapeKeyDown
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        PaperProps={{
          sx: {
            width: scaledDimension(
              {
                xs: { base: 90, min: 80, max: 90 },
                sm: { base: 90, min: 80, max: 90 },
                md: { base: 60, min: 50, max: 70 },
                lg: { base: 50, min: 40, max: 50 },
              },
              scale
            ),
            maxWidth: 'none',
            height: '100%',
            borderRadius: `${Math.max(8, 16 * scale)}px`,
            p: 2 * scale
          }
        }}
        slots={{ transition: Transition }}
        sx={{ zIndex: 1300, height: '100%' }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 * scale, position: 'relative', alignItems: 'center', justifyContent: 'center', height: '5%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 1 * scale, position: 'absolute', right: 3 * scale, top: 3 * scale }}>
            <IconButton onClick={cancel}><Close sx={{ fontSize: 40 * scale }} /></IconButton>
          </Box>
          <Box sx={{ mt: 2 * scale }}>
            <Typography variant="h4" sx={{ fontWeight: 'bold', textAlign: 'center', p: 2 * scale }}>
              Registrar usuario
            </Typography>
          </Box>
        </Box>

        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", height: "100%", width: "100%", px: 4 * scale }}>
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
                  onChange={(e) => {
                    setPeriod(e.target.value);
                    log.debug('period.change', { period: e.target.value });
                  }}
                  sx={{ fontSize: `${32 * scale}px`, fontWeight: "bold", color: "#009640" }}
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
                setValue={() => { }}
                disabled
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <Event sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Fecha de finalización"
                value={endDate?.format("YYYY-MM-DD")}
                setValue={() => { }}
                disabled
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <AttachMoney sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Valor a pagar"
                value={formatCurrency(amount)}
                setValue={() => { }}
                disabled
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", flex: 1, width: "100%" }}>
              <Discount sx={{ mr: 2 * scale, fontSize: 52 * scale }} />
              <TextFieldVirtKeyPad
                label="Descuento (%)"
                value={porcentage}
                setValue={() => { }}
                disabled
              />
            </Box>

            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 * scale, width: "100%", pt: 4 * scale }}>
              <Button variant="contained" color="secondary" onClick={cancel} sx={{ flex: 1 }}>
                Cancelar
                <Close sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
              </Button>

              <Button variant="contained" color="success" type="submit" sx={{ flex: 1 }}>
                Registrar
                <DoneAll sx={{ fontSize: 40 * scale, ml: 3 * scale }} />
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>

      <SnackAlert open={snackbarOpen} message={snackbarMessage} severity={snackbarSeverity} onClose={() => setSnackbarOpen(false)} />

      <ConfirmDialog
        open={confirmDialogOpen}
        onConfirm={() => { log.info('confirm.accept'); confirmSendData(); }}
        onCancel={() => { log.info('confirm.cancel'); cancelConfirmation(); }}
        tittle="Confirmar"
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
        hideBackdrop
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      <ShowErrorAPI
        open={showErrorAPIOpen}
        onConfirm={() => { log.info('error.dialog.ok'); confirmShowErrorAPI(); }}
        msg={messageErrorAPI}
        timeout={timeoutShowMessage}
        hideBackdrop
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      <ShowLocker
        open={showLockerOpen}
        onConfirm={() => { log.info('locker.dialog.ok'); confirmAssignLocker(); }}
        locker={locker}
        title="Casillero reservado:"
        msg="Datos registrados exitosamente"
        timeout={timeoutShowMessage}
        backColor="info.main"
        hideBackdrop
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
      />

      {loading && <Loading message={messageLoading} />}
    </>
  );
};
