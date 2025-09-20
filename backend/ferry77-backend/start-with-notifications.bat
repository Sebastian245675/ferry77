@echo off
echo ========================================
echo  Ferry77 Backend con Notificaciones Escalables
echo ========================================
echo.

echo 1. Iniciando Kafka (Docker)...
docker-compose -f docker-compose.kafka.yml up -d

echo.
echo 2. Esperando que Kafka esté listo...
timeout /t 10 /nobreak > nul

echo.
echo 3. Compilando y ejecutando backend...
call mvn clean compile
if %ERRORLEVEL% neq 0 (
    echo Error en compilación
    exit /b 1
)

echo.
echo 4. Ejecutando aplicación Spring Boot...
call mvn spring-boot:run

echo.
echo Backend iniciado correctamente!
echo - Kafka UI disponible en: http://localhost:8080
echo - Backend API disponible en: http://localhost:8090
echo - Endpoints de notificaciones:
echo   * GET /api/usuarios/{uid}/notifications
echo   * GET /api/usuarios/{uid}/notifications/unread-count
echo   * PUT /api/notifications/{id}/read
pause