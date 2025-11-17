# PowerShell script to import the certificate into Windows Trusted Root Certificate Store
# This eliminates the "Your connection is not private" warning

Write-Host "Installing certificate into Windows Trusted Root Certificate Store..." -ForegroundColor Cyan

$certPath = "$PSScriptRoot\localhost+3-cert.pem"

if (-not (Test-Path $certPath)) {
    Write-Host "Error: Certificate file not found at $certPath" -ForegroundColor Red
    exit 1
}

try {
    # Import the certificate into the Trusted Root Certification Authorities store
    $cert = New-Object System.Security.Cryptography.X509Certificates.X509Certificate2($certPath)
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("Root", "CurrentUser")
    $store.Open("ReadWrite")
    $store.Add($cert)
    $store.Close()
    
    Write-Host "✅ Certificate installed successfully!" -ForegroundColor Green
    Write-Host "Please restart Chrome for changes to take effect." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After restarting Chrome, https://localhost:4000 will work without warnings!" -ForegroundColor Green
} catch {
    Write-Host "Error installing certificate: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Run 'mkcert -install' in PowerShell as Administrator" -ForegroundColor Yellow
    exit 1
}



