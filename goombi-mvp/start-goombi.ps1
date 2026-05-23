#Requires -Version 5.1
<#
.SYNOPSIS
    Starts the Goombi MVP backend and frontend dev servers, then opens the browser.
.DESCRIPTION
    - Checks whether ports 8000 (backend) and 5173 (frontend) are already in use.
    - Activates the Python virtual environment and starts uvicorn in a new window.
    - Starts the Vite dev server in a new window.
    - Waits a few seconds and opens http://127.0.0.1:5173 in the default browser.

    Press Ctrl+C in each server window to stop the servers.
#>

Set-StrictMode -Version Latest

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"

function Test-PortInUse([int]$port) {
    $connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
    return $null -ne $connections -and $connections.Count -gt 0
}

# ── Port pre-flight checks ────────────────────────────────────────────────────

if (Test-PortInUse 8000) {
    Write-Warning "Port 8000 is already in use. The backend server may already be running."
    Write-Host "  If you want to restart it, close the existing process first." -ForegroundColor Yellow
}

if (Test-PortInUse 5173) {
    Write-Warning "Port 5173 is already in use. The frontend dev server may already be running."
    Write-Host "  If you want to restart it, close the existing process first." -ForegroundColor Yellow
}

# ── Backend ───────────────────────────────────────────────────────────────────

$venvActivate = Join-Path $backendDir ".venv\Scripts\Activate.ps1"

if (-not (Test-Path $venvActivate)) {
    Write-Error "Python virtual environment not found at: $venvActivate`nRun: python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r requirements.txt"
}

$backendCmd = "Set-Location '$backendDir'; & '$venvActivate'; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

Write-Host "Starting backend  (uvicorn, port 8000)..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal

# ── Frontend ──────────────────────────────────────────────────────────────────

$npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $npmCmd) {
    Write-Error "npm not found on PATH. Install Node.js and try again."
}
$npmExe = $npmCmd.Source

$envFile = Join-Path $frontendDir ".env"
if (-not (Test-Path $envFile)) {
    $envExample = Join-Path $frontendDir ".env.example"
    if (Test-Path $envExample) {
        Copy-Item $envExample $envFile
        Write-Host "Copied .env.example → .env" -ForegroundColor Green
    } else {
        Write-Warning ".env file not found in frontend/. Map tiles may not load correctly."
    }
}

$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "Installing frontend dependencies (npm install)..." -ForegroundColor Cyan
    Push-Location $frontendDir
    try { & $npmExe install } finally { Pop-Location }
}

$frontendCmd = "Set-Location '$frontendDir'; & '$npmExe' run dev"

Write-Host "Starting frontend (Vite, port 5173)..." -ForegroundColor Cyan
Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal

# ── Open browser ──────────────────────────────────────────────────────────────

Write-Host "Waiting for servers to initialise..." -ForegroundColor DarkGray
Start-Sleep -Seconds 4

$url = "http://127.0.0.1:5173"
Write-Host "Opening $url in the default browser." -ForegroundColor Green
Start-Process $url

Write-Host ""
Write-Host "Goombi is starting!" -ForegroundColor Green
Write-Host "  Backend:  http://127.0.0.1:8000"
Write-Host "  Frontend: http://127.0.0.1:5173"
Write-Host ""
Write-Host "Close the two server windows (or press Ctrl+C inside each) to stop." -ForegroundColor DarkGray
