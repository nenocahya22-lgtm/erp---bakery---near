@echo off
cd /d "%~dp0"
del /q 17140278181404.rar 2>nul
if not exist .gitignore echo.> .gitignore
findstr /C:"17140278181404.rar" .gitignore >nul 2>nul
if errorlevel 1 echo 17140278181404.rar>> .gitignore
echo  File sampah dihapus + ditambahkan ke .gitignore
