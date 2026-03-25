$ErrorActionPreference = "Stop"

$ports = 3000, 3001, 4000

$listeners = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in $ports } |
  Select-Object -ExpandProperty OwningProcess -Unique

foreach ($processId in $listeners) {
  try {
    Stop-Process -Id $processId -Force
    Write-Host "Stopped process $processId"
  } catch {
    Write-Warning "Could not stop process ${processId}: $($_.Exception.Message)"
  }
}
