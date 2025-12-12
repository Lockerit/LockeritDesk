# Lockerit Desk

Sistema de asignación y gestión de casilleros como aplicación de escritorio, construido con **React + Vite** y **Electron**.

---

## Tabla de contenidos  
- Descripción  
- Tecnologías principales  
- Arquitectura general  
- Estructura del proyecto  
- Instalación  
- Configuración  
- Scripts npm disponibles  
- Construcción y distribución  
- Registro y logs  
- Colores de configuración  
- Licencia  

---

## Descripción

Lockerit Desk es una aplicación de escritorio multiplataforma para la gestión y asignación de casilleros, diseñada para operar de forma local y totalmente configurable mediante archivos JSON externos.

---

## Tecnologías principales

- React + Vite  
- Electron + electron-builder  
- Material UI  
- Axios  
- WebSocket  
- Winston + DailyRotateFile  
- Configuración externa mediante JSON + .env  

---

## Arquitectura general

1. **Electron (main process)**  
2. **Preload (puente seguro hacia React)**  
3. **Renderer en React**  

---

## Estructura del proyecto

```
LockeritDesk/
├─ electron/
│  ├─ main/
│  ├─ preload/
│  ├─ logger/
│  └─ watchers/
├─ src/
│  ├─ app/
│  ├─ features/
│  ├─ services/
│  ├─ shared/
│  ├─ assets/
│  └─ main.jsx
├─ public/
├─ configFiles/
│  ├─ .env
│  ├─ setup_config.json
│  ├─ lockers_colors_config.json
│  ├─ auth_key.json
│  └─ logger_config.json
├─ Dockerfile
├─ package.json
└─ vite.config.mjs
```

---

## Instalación

```
git clone https://github.com/Lockerit/LockeritDesk.git
cd LockeritDesk
npm install
npm run dev
```

---

## Configuración

Toda la configuración se realiza desde `configFiles/`.

### setup_config.json  
- Datos del punto  
- Usuarios  
- UI  
- Temas de color  
- Tiempos de interfaz  
- Voz  
- Programación de reportes  

### lockers_colors_config.json  
- Colores por estado  
- Colores por grupo  

### auth_key.json  
- Llave de autenticación  

### logger_config.json  
- Nivel de log  
- Rotación  
- Campos redactados  

---

## Scripts npm disponibles

```
npm run dev
npm run dev:watch
npm run clean
npm run build
npm run build:web
npm run build:electron
npm run build:linux
npm run build:win
npm run build:all
npm run docker:build
npm run docker:linux
npm run docker:win
npm run docker:all
npm run preview
npm run test:range
npm run lint
npm run lint:fix
npm run format
```

---

## Construcción y distribución

```
npm run build
npm run build:linux
npm run build:win
npm run build:all
```

Artefactos finales en: `release/`

---

## Registro y logs

- Rotación diaria  
- Máximo 15 días  
- Máximo 20 MB  
- Campos redactados: phone, pin, password, token  

---

# Colores de configuración

## Tema de la interfaz

| Hex     | Nombre del color                | Variable              |
| ------- | ------------------------------- | --------------------- |
| #009640 | Verde intenso / Verde principal | primaryMain           |
| #ffffff | Blanco puro                     | primaryContrastText   |
| #0c315e | Azul petróleo oscuro            | secondaryMain         |
| #ffffff | Blanco puro                     | secondaryContrastText |
| #212121 | Gris carbón                     | tertiaryMain          |
| #ffffff | Blanco puro                     | tertiaryContrastText  |
| #0c315e | Azul petróleo oscuro            | textPrimary           |
| #009640 | Verde intenso / Verde principal | textSecondary         |
| #f9f9f9 | Gris muy claro / Blanco humo    | backgroundDefault     |
| #f1f1f1 | Gris claro                      | layoutBackground      |


---

## Estados de casilleros

| Hex     | Nombre del color      | Variable      |
| ------- | --------------------- | ------------- |
| #2e7d32 | Verde bosque          | libre         |
| #c62828 | Rojo intenso / alarma | ocupado       |
| #0288d1 | Azul brillante        | reservado     |
| #6d6d6d | Gris medio            | deshabilitado |
| #6a1b9a | Morado oscuro         | asignado      |


---

## Colores por grupo

| Hex     | Nombre del color         | Variable |
| ------- | ------------------------ | -------- |
| #7D1304 | Rojo vino / rojo quemado | Grupo 1  |
| #17046E | Azul índigo oscuro       | Grupo 2  |
| #106E14 | Verde esmeralda oscuro   | Grupo 3  |


---

## Licencia

MIT
