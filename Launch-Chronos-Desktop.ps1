Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CHRONOS • Board Meeting Dual Clock (Desktop App)" -ForegroundColor Yellow
Write-Host "  Starting with Native Always-On-Top Popups..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Set-Location $PSScriptRoot
npx electron .
