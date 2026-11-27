@echo off
setlocal enableextensions
cd /d "%~dp0"

if exist ".run.pid" (
  for /f "usebackq delims=" %%P in (".run.pid") do (
    if not "%%P"=="" (
      taskkill /PID %%P /T /F >nul 2>nul
    )
  )
  del /f /q ".run.pid" >nul 2>nul
)

powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 3000,4000 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"

echo [INFO] VoiceKhata servers stopped.
exit /b 0
