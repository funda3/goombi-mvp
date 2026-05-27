#Requires -Version 5.1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$canonical = Join-Path $scriptDir "start.ps1"

if (-not (Test-Path $canonical)) {
    Write-Error "Expected launcher not found: $canonical"
}

& $canonical
