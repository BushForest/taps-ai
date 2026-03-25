$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$pnpm = Join-Path $env:APPDATA "npm\pnpm.cmd"
$pnpmArgs = @()

if (-not (Test-Path $pnpm)) {
  $corepack = "C:\Program Files\nodejs\corepack.cmd"
  if (Test-Path $corepack) {
    $pnpm = $corepack
    $pnpmArgs = @("pnpm")
  } else {
    throw "pnpm.cmd not found at $pnpm and corepack.cmd not found at $corepack"
  }
}

$env:Path = "C:\Program Files\nodejs;$env:APPDATA\npm;" + $env:Path
if (-not $env:NEXT_PUBLIC_API_BASE_URL) { $env:NEXT_PUBLIC_API_BASE_URL = "http://localhost:4000" }

Set-Location $root
& $pnpm @pnpmArgs --filter @taps/admin-web dev
