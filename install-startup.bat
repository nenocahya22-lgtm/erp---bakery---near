@echo off
title Near Bakery — Install Auto-Start Printer Relay
cd /d "%~dp0"
echo.
echo  ==========================================
echo    INSTALL AUTO-START PRINTER RELAY
echo  ==========================================
echo.
echo  Script ini akan mendaftarkan relay server
echo  printer thermal agar otomatis jalan setiap
echo  kali Windows menyala.
echo.

REM Cek Python
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
    echo  Install Python dulu dari https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

REM Cek python-escpos
echo  Memeriksa python-escpos...
"%PYTHON_CMD%" -c "import escpos" >nul 2>nul
if %errorlevel% neq 0 (
    echo  [INFO] python-escpos belum terinstall. Menginstall...
    "%PYTHON_CMD%" -m pip install python-escpos
    if %errorlevel% neq 0 (
        echo  [ERROR] Gagal install python-escpos!
        pause
        exit /b 1
    )
    echo  ✅ python-escpos berhasil diinstall!
) else (
    echo  ✅ python-escpos sudah terinstall!
)

echo.
echo  Mendaftarkan ke Windows Startup...

REM Hapus path separator di akhir %~dp0 (selalu \ di akhir)
set PROJ_DIR=%~dp0
set PROJ_DIR=%PROJ_DIR:~0,-1%

REM Buat stub batch di Startup yang memanggil start-printer.bat asli dari folder project
set STUB_PATH="%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\NearBakeryPrinter.bat"
(
echo @echo off
echo start /min "" "%PROJ_DIR%\start-printer.bat"
) > %STUB_PATH%

echo  ✅ Auto-start terdaftar:
echo     %STUB_PATH%
echo     ^|_ menunjuk ke: "%PROJ_DIR%\start-printer.bat"
echo.
echo  Setiap login Windows, stub ini akan menjalankan
  start-printer.bat secara otomatis (minimized).

echo.
echo  ==========================================
echo    INSTALASI SELESAI!
echo  ==========================================
echo.
echo  Setiap kali Windows menyala, relay server
echo  akan otomatis jalan.
echo.
echo  Untuk memulai sekarang, double-click:
echo     start-printer.bat
echo.
pause
