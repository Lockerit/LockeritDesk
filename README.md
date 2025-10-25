# Lockerit Desk

Sistema de Asignación de Casilleros desarrollado con **React**, **Vite** y **Electron**.

## Tabla de Contenidos

- [Descripción](#descripción)
- [Características](#características)
- [Instalación](#instalación)
- [Scripts Disponibles](#scripts-disponibles)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Configuración](#configuración)
- [Construcción y Distribución](#construcción-y-distribución)
- [Licencia](#licencia)

---

## Descripción

**Lockerit Desk** es una aplicación de escritorio multiplataforma para la gestión y asignación de casilleros, utilizando tecnologías modernas como React, Vite y Electron.

## Características

- Interfaz moderna y responsiva con React y Material UI.
- Backend local con Electron.
- Configuración flexible mediante archivos `.env` y JSON.
- Registro de logs y auditoría.
- Empaquetado y distribución con Electron Builder.

## Instalación

1. **Clona el repositorio:**
   ```sh
   git clone https://github.com/tu-usuario/lockerit-desk.git
   cd lockerit-desk
   ```
2. **Instala las dependencias:**
   ```sh
   npm install
   ```
3. **Configura el entorno:**
   - Copia el archivo `.env.example` a `.env` y ajusta las configuraciones según tus necesidades.

4. **Inicia la aplicación:**
   ```sh
   npm run dev
   ```

## Scripts Disponibles

- `dev`: Inicia la aplicación en modo desarrollo.
- `build`: Construye la aplicación para producción.
- `serve`: Sirve la aplicación construida.

## Estructura del Proyecto

```plaintext
LockeritDesk/
├─ electron/
│  ├─ main/                 # Proceso principal (antes: main.js)
│  │  └─ index.js
│  ├─ preload/              # Único puente al renderer (antes: preload.js)
│  │  └─ index.js
│  ├─ logger/               # ya existe: logger.js
│  └─ watchers/             # ya existe: auth/env/logger/setup watcher .js
│
├─ src/                     # React (renderer)
│  ├─ app/                  # App shell, router, providers
│  │  └─ App.jsx
│  ├─ features/
│  │  ├─ admin/             # adminLockers.jsx, reportLockers.jsx, tabAdmin.jsx, tableReportLockers.jsx
│  │  ├─ operator/          # ppal.jsx
│  │  └─ auth/              # login.jsx
│  ├─ services/
│  │  ├─ api/               # assignLocker.js, getAllStatusLockers.js, open*.js, report.js, reserve.js, setStatusLocker.js
│  │  └─ realtime/          # websocket.js
│  ├─ shared/
│  │  ├─ components/
│  │  │  ├─ layout/         # appbar.jsx, clock.jsx, progressbar.jsx, snackAlert.jsx
│  │  │  └─ dialogs/        # insertMoney.jsx, keypadNumeric.jsx, loading.jsx, registerUserPeriod.jsx, showErrorAPI.jsx, showLocker.jsx
│  │  ├─ context/           # keyboardContext.jsx, modalContext.jsx, userContext.jsx, windowSizeContext.jsx
│  │  ├─ hooks/             # useScheduleReport.js
│  │  ├─ utils/             # getDateRange.js, testGetDateRange.js, theme.js, utils.js
│  │  └─ constants/         # (crear más adelante: STATUS, rutas, etc.)
│  ├─ assets/               # ya existe si la usas desde React
│  └─ main.jsx              # entry React (ya existe)
│
├─ public/                  # estáticos (ya existe)
├─ configFiles/             # configs empaquetadas (ya existe)
├─ index.html               # (ya existe)
├─ vite.config.js           # (ya existe)
├─ eslint.config.js         # (ya existe)
└─ package.json             # (ya existe)
```

## Configuración

La configuración de la aplicación se maneja principalmente a través de archivos `.env` y archivos JSON en la carpeta `src/config`. Asegúrate de revisar estos archivos para personalizar la aplicación según tus necesidades.

## Construcción y Distribución

Para construir y distribuir la aplicación, utiliza el siguiente comando:

```sh
npm run build
npm run build:all / para construir Windows y Linux
```

Esto generará una versión optimizada de la aplicación en la carpeta `dist`, lista para ser distribuida.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.