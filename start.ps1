#Requires -Version 5.1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Join-Path $scriptDir "goombi-mvp"
$launcher = Join-Path $projectRoot "start.ps1"

if (-not (Test-Path $launcher)) {
    Write-Error "Expected launcher not found: $launcher"
}

& $launcher
