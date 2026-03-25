$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$logRoot = Join-Path $root ".demo-logs"
$runId = Get-Date -Format "yyyyMMdd-HHmmss"
$logDir = Join-Path $logRoot $runId

New-Item -ItemType Directory -Force $logRoot | Out-Null
New-Item -ItemType Directory -Force $logDir | Out-Null
Set-Content -Path (Join-Path $logRoot "latest.txt") -Value $runId

$targets = @(
  @{
    Name = "api"
    Script = Join-Path $PSScriptRoot "start-demo-api.ps1"
  },
  @{
    Name = "customer"
    Script = Join-Path $PSScriptRoot "start-demo-customer.ps1"
  },
  @{
    Name = "admin"
    Script = Join-Path $PSScriptRoot "start-demo-admin.ps1"
  }
)

foreach ($target in $targets) {
  $out = Join-Path $logDir "$($target.Name).log"
  $err = Join-Path $logDir "$($target.Name).err"
  $command = "start `"$($target.Name)`" /min powershell -NoProfile -ExecutionPolicy Bypass -File `"$($target.Script)`" 1>>`"$out`" 2>>`"$err`""

  $process = Start-Process cmd.exe `
    -WorkingDirectory $root `
    -ArgumentList "/c", $command `
    -PassThru

  [PSCustomObject]@{
    Name = $target.Name
    Id = $process.Id
    Log = $out
    ErrorLog = $err
  }
}
