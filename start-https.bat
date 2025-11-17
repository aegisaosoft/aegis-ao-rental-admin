@echo off
echo Starting Admin App with HTTPS on port 4000...
echo.
echo Access at: https://localhost:4000
echo           https://192.168.1.147:4000
echo.

set PORT=4000
set HTTPS=true
set SSL_CRT_FILE=%~dp0localhost+3-cert.pem
set SSL_KEY_FILE=%~dp0localhost+3-key.pem

npm start

