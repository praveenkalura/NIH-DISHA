# PowerShell script to start both Python backend and React frontend

Write-Host "Starting IPA Stats Application..." -ForegroundColor Green

# Check if Python is installed
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Python is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Check if Node.js is installed
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Install Python dependencies
Write-Host "`nInstalling Python dependencies..." -ForegroundColor Cyan
Set-Location python_backend
python -m pip install -r requirements.txt
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install Python dependencies" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Set-Location ..

# Start Python backend in background
Write-Host "`nStarting Python backend server..." -ForegroundColor Cyan
$pythonJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    Set-Location python_backend
    python server.py
}

# Wait a bit for Python server to start
Start-Sleep -Seconds 3

# Start React frontend
Write-Host "`nStarting React frontend..." -ForegroundColor Cyan
npm run dev

# Cleanup: Stop Python server when script ends
Write-Host "`nStopping servers..." -ForegroundColor Yellow
Stop-Job $pythonJob
Remove-Job $pythonJob
Write-Host "Servers stopped." -ForegroundColor Green
