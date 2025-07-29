@echo off
setlocal enabledelayedexpansion

echo Verificando cambios en el repositorio...

REM Verificar si hay cambios no confirmados
git diff --quiet
set "NO_CHANGES_1=%ERRORLEVEL%"

git diff --cached --quiet
set "NO_CHANGES_2=%ERRORLEVEL%"

if %NO_CHANGES_1%==0 if %NO_CHANGES_2%==0 (
    echo No hay cambios que subir.
    exit /b 0
)

REM Mostrar estado
git status

REM Confirmar si desea continuar
set /p confirmacion=¿Deseas subir estos cambios? (s/n): 
if /I not "%confirmacion%"=="s" (
    echo Operación cancelada por el usuario.
    exit /b 1
)

REM Solicitar mensaje de commit
set /p mensaje=Ingresa el mensaje para el commit: 
if "%mensaje%"=="" (
    echo Debes ingresar un mensaje válido para el commit.
    exit /b 1
)

REM Agregar todos los archivos
echo Ejecutando 'git add .'
git add .

REM Verificar si hay algo en staging para commitear
git diff --cached --quiet
if %ERRORLEVEL%==0 (
    echo No hay cambios nuevos para commitear.
    exit /b 0
)

REM Hacer commit
echo Ejecutando 'git commit -m "%mensaje%"'
git commit -m "%mensaje%"

REM Obtener rama actual
for /f "delims=" %%i in ('git branch --show-current') do set "currentBranch=%%i"

REM Hacer push
echo ⬆️  Ejecutando 'git push origin %currentBranch%'
git push origin %currentBranch%

echo Cambios subidos exitosamente a la rama '%currentBranch%'.

pause
