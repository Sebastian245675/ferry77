@echo off
echo Actualizando Firebase UID en la base de datos...
echo.

REM Ajusta estos valores según tu configuración
set DB_NAME=ferry77
set DB_USER=root
set DB_PASS=

echo Ejecutando UPDATE en la base de datos %DB_NAME%...
mysql -u %DB_USER% -p%DB_PASS% %DB_NAME% -e "UPDATE usuarios SET firebase_uid = 'ElPteWaqUWZEpWVc3IiMUHBkibl1' WHERE email = 'juventud500oficial@gmail.com' AND user_type = 'empresa';"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Firebase UID actualizado correctamente
    echo.
    echo Verificando el cambio...
    mysql -u %DB_USER% -p%DB_PASS% %DB_NAME% -e "SELECT id, email, firebase_uid, user_type, rol FROM usuarios WHERE email = 'juventud500oficial@gmail.com';"
) else (
    echo.
    echo ❌ Error actualizando el Firebase UID
)

pause
