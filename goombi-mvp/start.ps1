#Requires -Version 5.1
<#
.SYNOPSIS
    Starts Goombi backend/frontend and opens the external default browser.
.DESCRIPTION
    - Starts backend on 8000 if not already running.
    - Starts frontend on 5173 if not already running.
    - Waits until the frontend URL responds.
    - Opens http://127.0.0.1:5173 via Start-Process.
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendDir = Join-Path $scriptDir "backend"
$frontendDir = Join-Path $scriptDir "frontend"
$url = "http://127.0.0.1:5173"

function Test-PortInUse([int]$Port) {
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return @($connections).Count -gt 0
}

function Wait-PortOpen([int]$Port, [int]$TimeoutSeconds = 45) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortInUse $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Wait-HttpReady([string]$Uri, [int]$TimeoutSeconds = 90) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
                return $true
            }
        } catch {
            # Keep polling until timeout.
        }
        Start-Sleep -Seconds 1
    }
    return $false
}

# Backend
$venvActivate = Join-Path $backendDir ".venv\Scripts\Activate.ps1"
if (-not (Test-Path $venvActivate)) {
    Write-Error "Python virtual environment not found at: $venvActivate"
}

if (-not (Test-PortInUse 8000)) {
    $backendCmd = "Set-Location '$backendDir'; & '$venvActivate'; uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"
    Write-Host "Starting backend process on port 8000..." -ForegroundColor Cyan
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal | Out-Null
}

if (-not (Wait-PortOpen 8000 45)) {
    Write-Error "Backend did not open port 8000 in time."
}
Write-Host "Backend running on port 8000" -ForegroundColor Green

# Frontend
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
        Write-Host "Copied .env.example to .env" -ForegroundColor Green
    }
}

$nodeModules = Join-Path $frontendDir "node_modules"
if (-not (Test-Path $nodeModules)) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    Push-Location $frontendDir
    try {
        & $npmExe install
    } finally {
        Pop-Location
    }
}

if (-not (Test-PortInUse 5173)) {
    $frontendCmd = "Set-Location '$frontendDir'; & '$npmExe' run dev -- --host 127.0.0.1 --port 5173"
    Write-Host "Starting frontend process on port 5173..." -ForegroundColor Cyan
    Start-Process powershell.exe -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal | Out-Null
}

if (-not (Wait-HttpReady $url 90)) {
    Write-Error "Frontend did not become ready at $url in time."
}
Write-Host "Frontend running on port 5173" -ForegroundColor Green

Write-Host "Opening external browser" -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"

