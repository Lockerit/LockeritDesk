@echo off
setlocal enabledelayedexpansion

:: Solicitar nombre de la rama feature
set /p featureBranch=Ingresa el nombre de la rama feature (ej: ajusteServicios): 
set fullBranch=feature/%featureBranch%

:: Validar si estás en la rama correcta
for /f "delims=" %%i in ('git branch --show-current') do set currentBranch=%%i

if not "!currentBranch!"=="%fullBranch%" (
    echo No estás en la rama %fullBranch%. Estás en: !currentBranch!
    echo Por favor cambia manualmente con: git checkout %fullBranch%
    goto :EOF
)

:: Mostrar cambios sin guardar
echo Verificando si hay cambios sin guardar...
git status
git diff --quiet && git diff --cached --quiet
if errorlevel 1 (
    set /p continuar=Se detectaron cambios sin guardar. ¿Deseas agregarlos y hacer commit? (s/n): 
    if /i "!continuar!"=="s" (
        set /p commitMsg=Ingresa el mensaje de commit: 
        if "!commitMsg!"=="" (
            echo Debes ingresar un mensaje válido. Cancelando.
            goto :EOF
        )
        git add .
        git commit -m "!commitMsg!"
    ) else (
        echo Cancelado por el usuario.
        goto :EOF
    )
)

:: Subir rama feature al remoto
echo Subiendo %fullBranch% al remoto...
git push origin %fullBranch%
if errorlevel 1 (
    echo Error al subir la rama. Verifica tu conexión o permisos.
    goto :EOF
)

:: Cambiar a develop
echo ↩️ Cambiando a develop...
git checkout develop
if errorlevel 1 (
    echo No se pudo cambiar a develop.
    goto :EOF
)

:: Traer últimos cambios
echo Haciendo pull de develop...
git pull origin develop

:: Hacer merge
echo Haciendo merge con %fullBranch%...
git merge %fullBranch%
if errorlevel 1 (
    echo Conflicto durante el merge. Resuélvelo manualmente.
    goto :EOF
)

:: Subir develop actualizado
echo Subiendo develop actualizado...
git push origin develop

:: Eliminar rama local
echo Eliminando rama local: %fullBranch%...
git branch -d %fullBranch%

:: Eliminar rama remota
echo Eliminando rama remota: %fullBranch%...
git push origin --delete %fullBranch%

echo Rama %fullBranch% finalizada correctamente.

endlocal
pause
