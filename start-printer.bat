@echo off
title Near Bakery — Printer Relay Server
cd /d "%~dp0"
echo.
echo  ========================================
echo    NEAR BAKERY — PRINTER RELAY SERVER
echo  ========================================
echo.
echo  Mencari Python...
echo.

REM Cari python
set PYTHON_CMD=
where python >nul 2>nul
if %errorlevel%==0 set PYTHON_CMD=python
if "%PYTHON_CMD%"=="" (
    where python3 >nul 2>nul
    if %errorlevel%==0 set PYTHON_CMD=python3
)
if "%PYTHON_CMD%"=="" (
    where py >nul 2>nul
    if %errorlevel%==0 set PYTHON_CMD=py
)

if "%PYTHON_CMD%"=="" (
    echo  [ERROR] Python tidak ditemukan!
    echo  Install Python dari https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo  Python ditemukan: %PYTHON_CMD%
echo.
echo  Menjalankan relay server...
echo  Printer: COM11 @ 9600 baud
echo  Server : http://localhost:3001
echo.
echo  Biarkan jendela ini terbuka!
echo  Tutup jendela untuk menghentikan server.
echo.

"%PYTHON_CMD%" printer/relay_server.py

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Server berhenti dengan error kode: %errorlevel%
    echo.
    pause
)
