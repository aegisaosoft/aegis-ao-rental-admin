@echo off
echo.
echo ========================================
echo  Installing Certificate to Trust Store
echo ========================================
echo.
echo This will eliminate the Chrome warning for https://localhost:4000
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0trust-cert.ps1"

echo.
echo Press any key to exit...
pause > nul



