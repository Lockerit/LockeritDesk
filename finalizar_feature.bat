@echo off
setlocal enabledelayedexpansion

:: Solicitar nombre de la rama feature
set /p featureName=Ingresa el nombre de la rama feature que quieres finalizar (ej: ajusteServicios): 
set featureBranch=feature/%featureName%

echo.
echo ================================
echo Cambiando a la rama %featureBranch%...
echo ================================
git checkout %featureBranch%
IF ERRORLEVEL 1 goto error

echo.
echo ================================
echo Actualizando rama develop...
echo ================================
git fetch origin
git checkout develop
git pull origin develop
git checkout %featureBranch%
git merge develop

echo.
echo ================================
echo Verifica que tu código funcione antes de continuar.
pause

echo.
echo ================================
echo Subiendo rama actualizada al remoto...
echo ================================
git push origin %featureBranch%

echo.
echo ================================
echo Abre un Pull Request desde GitHub:
echo     %featureBranch% -> develop
echo ================================

echo.
set /p delete=¿Deseas eliminar la rama local y remota después del merge? (s/n): 
if /i "%delete%"=="s" (
    git checkout develop
    git branch -d %featureBranch%
    git push origin --delete %featureBranch%
    echo Rama eliminada.
) else (
    echo No se eliminó la rama.
)

goto end

:error
echo Ocurrió un error. Verifica si la rama existe correctamente.
goto end

:end
echo.
echo Proceso finalizado.
pause
