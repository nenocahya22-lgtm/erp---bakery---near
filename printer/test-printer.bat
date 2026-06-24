@echo off
title Near Bakery — Test Printer Thermal
cd /d "%~dp0"
echo.
echo  ==========================================
echo    TEST PRINTER THERMAL
echo  ==========================================
echo.
echo  Memeriksa komponen satu per satu...
echo.

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

REM ─── TEST 1: Python ───
echo  [1/4] Python...
if "%PYTHON_CMD%"=="" (
    echo  ❌ Python TIDAK ditemukan!
    echo     Install dari https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)
for /f "delims=" %%v in ('"%PYTHON_CMD%" --version 2^>^&1') do set PYTHON_VER=%%v
echo  ✅ %PYTHON_VER% ditemukan: %PYTHON_CMD%

REM ─── TEST 2: python-escpos ───
echo  [2/4] python-escpos...
"%PYTHON_CMD%" -c "import escpos; print('✅ python-escpos v' + escpos.__version__, end='')" 2>nul
if %errorlevel% neq 0 (
    echo  ❌ python-escpos BELUM terinstall!
    echo.
    echo  -> Install: %PYTHON_CMD% -m pip install python-escpos
    echo.
    pause
    exit /b 1
)
echo.

REM ─── TEST 3: Printer (default COM11) ───
echo  [3/4] Printer di COM11 (default)...
set TEST_SCRIPT=%TEMP%\near_printer_test.py
(
echo import sys
echo try:
echo     from escpos.printer import Serial
echo     p = Serial^(devfile='COM11', baudrate=9600, bytesize=8, parity='N', stopbits=1^)
echo     p.hw^('INIT'^)
echo     p.text^('NEAR BAKERY - TEST PRINT\n'^)
echo     p.text^('Jika teks ini terbaca, printer OK!\n'^)
echo     p.cut^(^)
echo     p.close^(^)
echo     print^('OK'^)
echo except Exception as e:
echo     print^('ERROR: ' + str^(e^)^)
) > "%TEST_SCRIPT%"
"%PYTHON_CMD%" "%TEST_SCRIPT%"
del "%TEST_SCRIPT%"

REM ─── TEST 4: Relay Server ───
echo  [4/4] Relay server di http://localhost:3001...
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/api/status' -UseBasicParsing | Out-Null; Write-Host 'OK' } catch { Write-Host 'FAIL' }" >nul 2>nul
if %errorlevel% equ 0 (
    echo  ✅ Relay server AKTIF di http://localhost:3001
) else (
    echo  ⚠️  Relay server TIDAK aktif.
    echo     Jalankan start-printer.bat dulu.
)

echo.
echo  ==========================================
echo    HASIL TEST
echo  ==========================================
echo.
echo  Kalau semua hijau, printer siap dipakai!
echo  Kalau ada yang merah, lihat pesan errornya.
echo.
pause
