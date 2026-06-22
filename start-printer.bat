@echo off
title Near Bakery — Printer Relay Server
cd /d "%~dp0"
setlocal enabledelayedexpansion

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

REM Cek python-escpos
"%PYTHON_CMD%" -c "import escpos" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo  [INFO] python-escpos belum terinstall. Menginstall...
    "%PYTHON_CMD%" -m pip install python-escpos
    if !errorlevel! neq 0 (
        echo  [ERROR] Gagal install! Jalankan manual:
        echo  "%PYTHON_CMD%" -m pip install python-escpos
        pause
        exit /b 1
    )
    echo.
    echo  ✅ python-escpos berhasil diinstall!
)

echo.
echo  Menjalankan relay server...
echo  Printer: COM11 @ 9600 baud
echo  Server : http://localhost:3001
echo.
echo  Biarkan jendela ini terbuka!
echo  Tutup jendela untuk menghentikan server.
echo.

REM Start server di background
start /b "" "%PYTHON_CMD%" printer/relay_server.py

REM Tunggu 3 detik biar server jalan
timeout /t 3 /nobreak >nul

REM Buka browser ke halaman status
start "" http://localhost:3001

REM Tunggu user tekan tombol
setlocal enabledelayedexpansion
echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   Relay server berjalan di background!  ║
echo  ║   Buka http://localhost:3001 di browser  ║
echo  ║                                          ║
echo  ║   Tekan ENTER untuk menghentikan server  ║
echo  ╚══════════════════════════════════════════╝
echo.
pause >nul

REM Hentikan Python
taskkill /f /im python.exe >nul 2>nul
taskkill /f /im python3.exe >nul 2>nul
echo Server dihentikan.

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Server berhenti dengan error kode: %errorlevel%
    echo.
    pause
)
