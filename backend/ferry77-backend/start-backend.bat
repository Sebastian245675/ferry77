@echo off
cd /d "c:\Users\PC\ferry77\backend\ferry77-backend"
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8090"
pause