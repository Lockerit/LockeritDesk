import {
  Person,
  Article,
  LowPriority,
  Event,
  Close,
  Cancel,
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
import { useTheme } from '@mui/material/styles';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { useState, useRef, forwardRef, useEffect } from 'react';

import { Reserve } from '@services/apis/reserve.js';
import { SnackAlert } from '@shared/components/bars/SnackAlert.jsx';
import { TextFieldVirtKeyPad } from '@shared/components/inputs/TextFieldVirtKeyPad.jsx';
import { useElectronConfig } from '@shared/hooks/useConfig.js';
import { useElectronLockersColors } from '@shared/hooks/useLockersColors.js';
import { dialogCtaButtonSx } from '@shared/theme/buttonSx.js';
import { logger } from '@shared/utils/logger.js';
import {
  PHONE_REGEX,
  formatCurrency,
  EMAIL_REGEX,
  NAME_REGEX,
  ID_REGEX,
  formatNumberPhone,
} from '@shared/utils/utils.js';

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
  const [nameUser, setNameUser] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [period, setPeriod] = useState('Mensual');
  const [email, setEmail] = useState('');
  const [locker, setLocker] = useState();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState();
  const [showErrorAPIOpen, setShowErrorAPIOpen] = useState();
  const [showLockerOpen, setShowLockerOpen] = useState();
  const [colorLocker, setColorLocker] = useState('#000000');

  const cleanupRef = useRef(null);
  const config = useElectronConfig();
  const lockersColors = useElectronLockersColors();
  const theme = useTheme();

  useEffect(() => {
    if (!lockersColors) return;
  }, [lockersColors]);

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
    log.debug('props', {
      open,
      period,
      startDate: startDate?.format?.('YYYY-MM-DD'),
    });
    if (!open) return;

    if (!startDate || !dayjs(startDate).isValid()) {
      const today = dayjs();
      setStartDate(today);
      setEndDate(today.add(1, 'month').subtract(1, 'day'));
      log.info(`startDate, { start: ${today.format('YYYY-MM-DD')} }`);
    }
    if (period === 'Mensual' && startDate) {
      const end = dayjs(startDate).add(1, 'month').subtract(1, 'day');
      setEndDate(end);
      log.debug(
        `Mensual, { start: ${startDate.format(
          'YYYY-MM-DD'
        )}, end: ${end.format('YYYY-MM-DD')} }`
      );
    }
  }, [open, period, startDate]);

  // Recalcular fin/valor/porcentaje ante cambios
  useEffect(() => {
    if (!startDate || !config) return;

    let newEndDate;
    if (period === 'Semanal') {
      newEndDate = dayjs(startDate).add(6, 'day');
      const val = Math.round(
        config?.paramsHtml?.currency?.coinBoxRequiredAmount *
        7 *
        (1 - config?.reserve?.porcentWeekly / 100)
      );
      setAmount(val);
      setPorcentage(config?.reserve?.porcentWeekly);
      setEndDate(newEndDate);
      log.info(
        `Recalculo semanal, { start: ${startDate.format(
          'YYYY-MM-DD'
        )}, end: ${newEndDate.format(
          'YYYY-MM-DD'
        )}, amount: ${val}, pct: ${config?.reserve?.porcentWeekly} }`
      );
    } else if (period === 'Quincenal') {
      newEndDate = dayjs(startDate).add(14, 'day');
      const val = Math.round(
        config?.paramsHtml?.currency?.coinBoxRequiredAmount *
        15 *
        (1 - config?.reserve?.porcentFortnightly / 100)
      );
      setAmount(val);
      setPorcentage(config?.reserve?.porcentFortnightly);
      setEndDate(newEndDate);
      log.info(
        `Recalculo quincenal, { start: ${startDate.format(
          'YYYY-MM-DD'
        )}, end: ${newEndDate.format(
          'YYYY-MM-DD'
        )}, amount: ${val}, pct: ${config?.reserve?.porcentFortnightly} }`
      );
    } else if (period === 'Mensual') {
      newEndDate = dayjs(startDate).add(1, 'month').subtract(1, 'day');
      const val = Math.round(
        config?.paramsHtml?.currency?.coinBoxRequiredAmount *
        30 *
        (1 - config?.reserve?.porcentMonthly / 100)
      );
      setAmount(val);
      setPorcentage(config?.reserve?.porcentMonthly);
      setEndDate(newEndDate);
      log.info(
        `Recalculo mensual, { start: ${startDate.format(
          'YYYY-MM-DD'
        )}, end: ${newEndDate.format(
          'YYYY-MM-DD'
        )}, amount: ${val}, pct: ${config?.reserve?.porcentMonthly} }`
      );
    }
  }, [startDate, period, config]);

  const clearInputs = () => {
    if (cleanupRef.current) cleanupRef.current();
    setNameUser('');
    setIdNumber('');
    setPhone('');
    setEmail('');
    setPeriod('Mensual');
    const today = dayjs();
    setStartDate(today);
    setEndDate(today.endOf('month'));
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
      errores.push('Los nombres son obligatorios');
      setErrorsEmpty((prev) => ({ ...prev, nameUser: true }));
      hasError = true;
    } else if (trimmedName.length > 50) {
      errores.push('Los nombres no deben superar los 50 caracteres');
      setErrorsEmpty((prev) => ({ ...prev, nameUser: true }));
      hasError = true;
    } else if (!NAME_REGEX.test(trimmedName)) {
      errores.push('Los nombres no deben contener carácteres especiales.');
      setErrorsEmpty((prev) => ({ ...prev, nameUser: true }));
      hasError = true;
    } else {
      setErrorsEmpty((prev) => ({ ...prev, nameUser: false }));
    }

    const trimmedId = idNumber.trim();
    if (!trimmedId) {
      errores.push('El número de identificación es obligatorio');
      setErrorsEmpty((prev) => ({ ...prev, idNumber: true }));
      hasError = true;
    } else if (trimmedId.length > 20) {
      errores.push(
        'El número de identificación no debe superar los 20 caracteres'
      );
      setErrorsEmpty((prev) => ({ ...prev, idNumber: true }));
      hasError = true;
    } else if (trimmedId.length < 6) {
      errores.push('El número de identificación no debe ser inferior a los 6 caracteres');
      setErrorsEmpty((prev) => ({ ...prev, idNumber: true }));
      hasError = true;
    } else if (!ID_REGEX.test(trimmedId)) {
      errores.push("El número de identificación solo debe contener números");
      setErrorsEmpty(prev => ({ ...prev, idNumber: true }));
      hasError = true;
    } else {
      setErrorsEmpty((prev) => ({ ...prev, idNumber: false }));
    }

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errores.push('El correo electrónico es obligatorio');
      setErrorsEmpty((prev) => ({ ...prev, email: true }));
      hasError = true;
    } else if (trimmedEmail.length > 50) {
      errores.push(
        'El correo electrónico no debe superar los 50 caracteres'
      );
      setErrorsEmpty((prev) => ({ ...prev, email: true }));
      hasError = true;
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errores.push('Correo electrónico inválido');
      setErrorsEmpty((prev) => ({ ...prev, email: true }));
      hasError = true;
    } else {
      setErrorsEmpty((prev) => ({ ...prev, email: false }));
    }

    const trimmedPhone = phone.trim();
    if (!trimmedPhone) {
      errores.push('El número celular es obligatorio');
      setErrorsEmpty((prev) => ({ ...prev, phone: true }));
      hasError = true;
    } else if (trimmedPhone.length > 10) {
      errores.push(
        'El número celular no debe superar los 10 caracteres'
      );
      setErrorsEmpty((prev) => ({ ...prev, phone: true }));
      hasError = true;
    } else if (!PHONE_REGEX.test(trimmedPhone)) {
      errores.push('Número celular inválido');
      setErrorsEmpty((prev) => ({ ...prev, phone: true }));
      hasError = true;
    } else {
      setErrorsEmpty((prev) => ({ ...prev, phone: false }));
    }

    if (errores.length > 0) {
      showAlert(errores.join(' | '), 'error');
      log.warn(`Validación fallida, { count: ${errores.length} }`);
    } else {
      log.info(`Validación exitosa`);
    }
    return !hasError;
  };

  const handleNameChange = (val) => {
    // 1) Opcional: bloquear directamente caracteres no válidos
    if (!NAME_REGEX.test(val)) {
      // si quieres simplemente ignorar el último carácter inválido:
      const limpio = val.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s]/g, '');
      setNameUser(limpio);
      return;
    }

    // 2) Si todo es válido, guardas normal
    setNameUser(val);
  };

  const handleIdChange = (val) => {
    // Si trae caracteres no permitidos, los limpiamos
    if (!ID_REGEX.test(val)) {
      const limpio = val.replace(/[^0-9]/g, '');
      setIdNumber(limpio);
      return;
    }

    setIdNumber(val);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    log.info('Iniciando Petición de registro de usuario');
    if (validateAllInputs()) {
      setConfirmDialogOpen(true);
      log.info('Confirmando Petición de registro de usuario');
    }
  };

  const getLockerColor = (lockerCode, groups) => {
    if (!lockerCode || !Array.isArray(groups)) return null;

    const group = groups.find(g => g.lockers.includes(lockerCode));
    return group ? group.color : null;
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
      nameUser: nameUser.trim(),
      idNumber: idNumber.trim(),
      email: email.trim(),
      phone: phone.trim(),
      period: period,
      startDate: dayjs(startDate).format('YYYY-MM-DD'),
      endDate: dayjs(endDate).format('YYYY-MM-DD'),
      amount: amount,
      porcentage: porcentage,
    };

    log.info(
      `Reserva solicitada, { period: {${period}}, startDate: ${payload.startDate
      }, endDate: ${payload.endDate}, amount: ${amount}, porcentage: ${porcentage
      } }`
    );

    try {
      const result = await Reserve(payload);

      if (result?.success) {
        const lockerCode =
          result?.data?.lockerCode ||
          result?.http?.data?.lockerCode ||
          '';
        log.info('reserve.call.success', {
          lockerCode: lockerCode || 'n/a',
        });

        if (lockerCode) {
          setLocker(lockerCode);
          setColorLocker(getLockerColor(lockerCode, lockersColors?.lockersColors) || '#000000');
          setShowLockerOpen(true);
          log.info(`Reserva exitosa, { lockerCode: ${lockerCode} }`);
        } else {
          setMessageErrorAPI('No se recibió código de casillero');
          setShowErrorAPIOpen(true);
          log.warn(
            `Reserva fallida, { reason: No se recibió código de casillero }`
          );
        }
      } else {
        const msg =
          result?.status === 500
            ? 'No se pudo registrar usuario, ¡Inténtalo nuevamente!'
            : result?.data?.message ||
            'No se pudo registrar usuario, ¡Inténtalo nuevamente!';
        setMessageErrorAPI(msg);
        setShowErrorAPIOpen(true);
        log.error(
          `Reserva fallida, { status: ${result?.status}, msg: ${msg} }`
        );
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
        PaperProps={{
          sx: {
            width: {
              xs: config?.paramsHtml.isVertical ? '95%' : '90%',
              sm: config?.paramsHtml.isVertical ? '85%' : '80%',
              md: config?.paramsHtml.isVertical ? '70%' : '60%',
              lg: config?.paramsHtml.isVertical ? '60%' : '50%',
            },
            maxWidth: 'none',
            maxHeight: '90vh',
            overflowY: 'auto',
            height: 'auto',
            borderRadius: theme.spacing(3),
            p: theme.spacing(3),
            boxShadow:
              '0 10px 50px rgba(0,0,0,0.8), 0 0 50px rgba(255,255,255,0.06)'
          },
        }}
        slots={{ transition: Transition }}
        sx={{ zIndex: 1300, height: '100%' }}
      >
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(2),
            position: 'relative',
            alignItems: 'center',
            justifyContent: 'center',
            mb: theme.spacing(2),
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
            <IconButton onClick={cancel}>
              <Close sx={{ fontSize: theme.spacing(5) }} />
            </IconButton>
          </Box>
          <Box sx={{ mt: theme.spacing(2) }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 'bold',
                textAlign: 'center',
                p: theme.spacing(1),
              }}
            >
              Registrar usuario
            </Typography>
          </Box>
        </Box>

        <DialogContent
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            px: { xs: 1, sm: 4 },
            pb: theme.spacing(2),
            gap: theme.spacing(2),
          }}
        >
          {/* Nombre */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <Person
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Nombres y apellidos"
              value={nameUser}
              setValue={handleNameChange}
              error={errorsEmpty.nameUser}
              helperText={
                errorsEmpty.nameUser ? 'Ingresa los nombres completos' : ''
              }
              inputProps={{ maxLength: 50 }}
            />
          </Box>

          {/* Identificación */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <Article
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Número de identificación"
              value={idNumber}
              setValue={handleIdChange}
              error={errorsEmpty.idNumber}
              helperText={
                errorsEmpty.idNumber ? 'Ingresa el número de identificación' : ''
              }
              inputProps={{ maxLength: 20 }}
            />
          </Box>

          {/* Email */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <Email
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Correo electrónico"
              value={email}
              setValue={setEmail}
              error={errorsEmpty.email}
              helperText={
                errorsEmpty.email
                  ? 'Ingresa el correo electrónico'
                  : ''
              }
              inputProps={{ maxLength: 50 }}
            />
          </Box>

          {/* Teléfono */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <MobileFriendly
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Número celular"
              value={phone}
              setValue={setPhone}
              error={errorsEmpty.phone}
              helperText={
                errorsEmpty.phone ? 'Ingresa el número celular' : ''
              }
              inputProps={{ maxLength: 10 }}
            />
          </Box>

          {/* Periodo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <LowPriority
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <FormControl variant="standard" fullWidth>
              <InputLabel id="period-select-label">
                Periodo de reserva
              </InputLabel>
              <Select
                labelId="period-select-label"
                value={period}
                onChange={(e) => {
                  setPeriod(e.target.value);
                  log.debug('period.change', {
                    period: e.target.value,
                  });
                }}
                sx={{
                  fontSize: theme.typography.h5.fontSize,
                  fontWeight: 'bold',
                  color: 'primary.main',
                }}
              >
                <MenuItem value="Semanal">Semanal</MenuItem>
                <MenuItem value="Quincenal">Quincenal</MenuItem>
                <MenuItem value="Mensual">Mensual</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Fecha inicio */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <Today
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Fecha de inicialización"
              value={startDate?.format('YYYY-MM-DD')}
              setValue={() => { }}
              disabled
            />
          </Box>

          {/* Fecha fin */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <Event
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Fecha de finalización"
              value={endDate?.format('YYYY-MM-DD')}
              setValue={() => { }}
              disabled
            />
          </Box>

          {/* Valor a pagar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <AttachMoney
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Valor a pagar"
              value={formatCurrency(amount)}
              setValue={() => { }}
              disabled
            />
          </Box>

          {/* Descuento */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              mb: theme.spacing(1),
            }}
          >
            <Discount
              sx={{
                mr: theme.spacing(2),
                fontSize: theme.spacing(7),
              }}
            />
            <TextFieldVirtKeyPad
              label="Descuento (%)"
              value={porcentage}
              setValue={() => { }}
              disabled
            />
          </Box>

          {/* Botones */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: theme.spacing(2),
              width: '100%',
              pt: theme.spacing(3),
            }}
          >
            <Button
              variant="contained"
              color="secondary"
              onClick={cancel}
              sx={{ flex: 1, ...dialogCtaButtonSx(theme) }}
            >
              Cancelar
              <Cancel
                sx={{ fontSize: theme.spacing(5), ml: theme.spacing(2) }}
              />
            </Button>

            <Button
              variant="contained"
              color="primary"
              type="submit"
              sx={{ flex: 1, ...dialogCtaButtonSx(theme) }}
            >
              Registrar
              <DoneAll
                sx={{ fontSize: theme.spacing(5), ml: theme.spacing(2) }}
              />
            </Button>
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
        onConfirm={() => {
          log.info('confirm.accept');
          confirmSendData();
        }}
        onCancel={() => {
          log.info('confirm.cancel');
          cancelConfirmation();
        }}
        tittle="Confirmar"
        items={[
          { label: 'Nombre completo', value: nameUser },
          {
            label: 'Identificación',
            value: formatCurrency(idNumber, { onlyThousands: true }),
          },
          { label: 'Correo electrónico', value: email },
          { label: 'Celular', value: formatNumberPhone(phone) },
          { label: 'Periodo', value: period },
          {
            label: 'Fecha inicio',
            value: startDate?.format('YYYY-MM-DD'),
          },
          {
            label: 'Fecha fin',
            value: endDate?.format('YYYY-MM-DD'),
          },
          {
            label: 'Valor a pagar',
            value: formatCurrency(amount),
          },
          { label: 'Descuento (%)', value: porcentage },
          {
            label: 'Nota',
            value: config?.sendSMS
              ? '¡Se enviará mensaje de texto al usuario!'
              : '',
          },
        ]}
        isPhone={false}
        hideBackdrop
      />

      <ShowErrorAPI
        open={showErrorAPIOpen}
        onConfirm={() => {
          log.info('error.dialog.ok');
          confirmShowErrorAPI();
        }}
        msg={messageErrorAPI}
        timeout={timeoutShowMessage}
        hideBackdrop
      />

      <ShowLocker
        open={showLockerOpen}
        onConfirm={() => {
          log.info('locker.dialog.ok');
          confirmAssignLocker();
        }}
        locker={locker}
        title="Casillero reservado:"
        msg="Datos registrados exitosamente"
        timeout={timeoutShowMessage}
        backColor={colorLocker}
        hideBackdrop
      />

      {loading && <Loading message={messageLoading} />}
    </>
  );
};
