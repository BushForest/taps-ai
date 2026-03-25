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
if (-not $env:NODE_ENV) { $env:NODE_ENV = "development" }
if (-not $env:PORT) { $env:PORT = "4000" }
if (-not $env:API_BASE_URL) { $env:API_BASE_URL = "http://localhost:4000" }
if (-not $env:PUBLIC_BASE_URL) { $env:PUBLIC_BASE_URL = "http://localhost:3000" }
if (-not $env:ADMIN_BASE_URL) { $env:ADMIN_BASE_URL = "http://localhost:3001" }
if (-not $env:JWT_SECRET) { $env:JWT_SECRET = "taps-demo-secret" }
if (-not $env:DATA_STORE_DRIVER) { $env:DATA_STORE_DRIVER = "postgres" }
if (-not $env:DATABASE_URL) { $env:DATABASE_URL = "postgres://postgres:postgres@localhost:5432/taps" }
if (-not $env:QUEUE_DRIVER) { $env:QUEUE_DRIVER = "memory" }
if (-not $env:POS_PROVIDER_MODE) { $env:POS_PROVIDER_MODE = "memory" }
if (-not $env:PAYMENT_PROVIDER_MODE) { $env:PAYMENT_PROVIDER_MODE = "mock" }

Set-Location $root
& $pnpm @pnpmArgs --filter @taps/api dev
