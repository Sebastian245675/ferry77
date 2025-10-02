@echo off
echo ========================================
echo     Iniciando Ferry77 Backend Server
echo ========================================
echo.

REM Cambiar al directorio del backend
cd /d "C:\Users\PC\ferry77\backend\ferry77-backend"

REM Verificar que estamos en el directorio correcto
if not exist "pom.xml" (
    echo ERROR: No se encontro pom.xml en el directorio actual
    echo Asegurate de estar en el directorio correcto
    pause
    exit /b 1
)

echo [INFO] Directorio de trabajo: %CD%
echo [INFO] Verificando conexion a la base de datos...
echo.

REM Compilar el proyecto
echo [INFO] Compilando el proyecto...
call mvn clean compile -q

if %ERRORLEVEL% neq 0 (
    echo [ERROR] Error durante la compilacion
    pause
    exit /b 1
)

echo [INFO] Compilacion exitosa
echo.

REM Iniciar el servidor con reinicio automatico
:START_SERVER
echo [INFO] Iniciando servidor backend...
echo [INFO] Puerto: 8090
echo [INFO] Base de datos: MySQL
echo [INFO] Para detener el servidor, presiona Ctrl+C
echo.
echo ========================================

REM Ejecutar Spring Boot
call mvn spring-boot:run

REM Si el servidor se cierra, preguntar si reiniciar
echo.
echo [WARNING] El servidor se ha detenido
echo.
choice /c YN /m "Deseas reiniciar el servidor? (Y/N)"

if %ERRORLEVEL%==1 (
    echo [INFO] Reiniciando servidor...
    echo.
    goto START_SERVER
) else (
    echo [INFO] Cerrando script...
    pause
    exit /b 0
)