@echo off
setlocal enabledelayedexpansion

REM Solicitar nombre de la nueva rama
set /p nueva_rama=🔧 Ingresa el nombre de la nueva rama (ej: login): 

REM Solicitar nombre de la rama base
set /p rama_base=🌱 Desde qué rama quieres crearla (ej: develop): 

REM Cambiar a la rama base
echo.
echo Cambiando a la rama base "!rama_base!"...
git checkout "!rama_base!" 2>NUL
IF ERRORLEVEL 1 (
    echo La rama base "!rama_base!" no existe o falló el checkout.
    goto end
)

REM Hacer pull de la rama base
echo Actualizando "!rama_base!" desde remoto...
git pull origin "!rama_base!"

REM Crear y cambiar a la nueva rama con prefijo "feature/"
set "nombre_completo=feature/!nueva_rama!"
echo Creando y cambiando a la nueva rama "!nombre_completo!"...
git checkout -b "!nombre_completo!"

REM Subir la nueva rama al repositorio remoto
echo Subiendo la rama al remoto...
git push -u origin "!nombre_completo!"

echo.
echo Rama "!nombre_completo!" creada y subida correctamente.

:end
pause
