Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CHRONOS • Board Meeting Dual Clock & Alarms" -ForegroundColor Yellow
Write-Host "  Starting local server for full desktop popup support..." -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening http://localhost:8080 in your browser..." -ForegroundColor Green
Write-Host "(Keep this window running in background during your meeting)" -ForegroundColor DarkGray
Write-Host ""

node server.js
if ($LASTEXITCODE -ne 0) {
    Start-Process "http://localhost:8080"
    python -m http.server 8080
}
