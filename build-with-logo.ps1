# Kanakkar Executable Builder with Logo
# PowerShell Script for Building and Adding Logo

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Kanakkar Executable Builder with Logo" -ForegroundColor Cyan  
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

try {
    Write-Host "🚀 Building executable..." -ForegroundColor Yellow
    npm run createexe
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Build successful!" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "🎨 Adding logo to executable..." -ForegroundColor Yellow
        node -e "const rcedit = require('rcedit'); const fs = require('fs'); const files = fs.readdirSync('dist').filter(f => f.endsWith('.exe')); files.forEach(f => rcedit('dist/' + f, { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added to', f)));"
        
        Write-Host ""
        Write-Host "🔄 Refreshing Windows icon cache..." -ForegroundColor Yellow
        ie4uinit.exe -show
        Start-Sleep 2
        
        Write-Host ""
        Write-Host "📁 Opening dist folder..." -ForegroundColor Yellow
        explorer.exe "dist"
        
        Write-Host ""
        Write-Host "✅ Build complete with logo!" -ForegroundColor Green
        Write-Host "💡 Right-click on .exe file and select Properties to verify logo" -ForegroundColor Blue
        
        # Show file info
        Write-Host ""
        Write-Host "📦 Generated files:" -ForegroundColor Cyan
        Get-ChildItem "dist/*.exe" | ForEach-Object { 
            Write-Host "   • $($_.Name) - $([math]::Round($_.Length/1MB, 2)) MB - Modified: $($_.LastWriteTime)" -ForegroundColor White
        }
        
    } else {
        Write-Host "❌ Build failed! Exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error occurred: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
