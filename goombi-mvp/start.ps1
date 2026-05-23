# Goombi MVP — start both servers
# Run from the repo root: .\start.ps1

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "Starting Goombi backend on http://127.0.0.1:8000 (new window)..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$root\backend'; .\.venv\Scripts\Activate.ps1; uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"
)

Start-Sleep -Seconds 2

Write-Host "Starting Goombi frontend on http://127.0.0.1:5173..."
Write-Host ""
Write-Host "Goombi running at http://127.0.0.1:5173"
Write-Host ""

Set-Location "$root\frontend"
npm run dev
