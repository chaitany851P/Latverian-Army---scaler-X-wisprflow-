@echo off
setlocal enableextensions
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js is not installed or not in PATH. Install Node.js 24+ first.
  exit /b 1
)

if not exist ".env" (
  if exist ".env.example" (
    copy /Y ".env.example" ".env" >nul
    echo [INFO] Created .env from .env.example
  )
)

if not exist "node_modules" (
  echo [INFO] Installing dependencies...
  call npm install
  if errorlevel 1 exit /b 1
)

if exist ".run.pid" (
  echo [INFO] Stopping previous VoiceKhata processes...
  call "%~dp0stop.bat"
)

echo [INFO] Building shared workspace libraries (@voicekhata/shared, @voicekhata/db)...
call npm run build:libs
if errorlevel 1 exit /b 1

echo [INFO] Starting VoiceKhata API (:4000) and Web Bench (:3000)...
powershell -NoProfile -Command "$root = (Get-Location).Path; $api = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','title VoiceKhata API && npm run dev:api' -WorkingDirectory $root -PassThru -WindowStyle Minimized; $web = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c','title VoiceKhata Web && npm run dev:web' -WorkingDirectory $root -PassThru -WindowStyle Minimized; @($api.Id, $web.Id) | Set-Content -Path (Join-Path $root '.run.pid') -Encoding ASCII"
if errorlevel 1 exit /b 1

echo [INFO] Waiting for servers to become ready...
powershell -NoProfile -Command "$ready = $false; for ($i = 0; $i -lt 45; $i++) { try { $h = Invoke-RestMethod 'http://127.0.0.1:4000/healthz' -TimeoutSec 2; $w = Invoke-WebRequest 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 2; if ($h.status -eq 'ok' -and $w.StatusCode -eq 200) { $ready = $true; break } } catch {}; Start-Sleep -Seconds 1 }; if (-not $ready) { Write-Error 'Servers did not start in time.'; exit 1 }"
if errorlevel 1 (
  call "%~dp0stop.bat"
  exit /b 1
)

echo.
echo ======================================================
echo   VoiceKhata is running!
echo   Counter Test Bench : http://localhost:3000
echo   Scalar API Docs    : http://localhost:4000/reference/
echo   Stop servers       : stop.bat
echo ======================================================
echo.

if /i not "%~1"=="--no-browser" (
  start "" "http://localhost:3000"
)
exit /b 0
