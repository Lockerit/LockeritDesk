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
lockerit-desk/
├──                 # Proceso principal de Electron
├──              # Preload scripts para Electron
├── src/                   # Código fuente de React
├── electron/              # Lógica adicional de Electron (loggers, watchers)
├── configFiles/           # Archivos de configuración (.env, JSON)
├── public/                # Archivos estáticos y assets
├── release/               # Builds generados
├── logs/                  # Archivos de logs y auditoría
├──            # Configuración de npm y scripts
├──          # Configuración de Vite
└── ...
```

## Configuración

La configuración de la aplicación se maneja principalmente a través de archivos `.env` y archivos JSON en la carpeta `src/config`. Asegúrate de revisar estos archivos para personalizar la aplicación según tus necesidades.

## Construcción y Distribución

Para construir y distribuir la aplicación, utiliza el siguiente comando:

```sh
npm run build
```

Esto generará una versión optimizada de la aplicación en la carpeta `dist`, lista para ser distribuida.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - consulta el archivo [LICENSE](LICENSE) para más detalles.