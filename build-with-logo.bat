@echo off
echo.
echo ========================================
echo  Kanakkar Executable Builder with Logo
echo ========================================
echo.

echo 🚀 Building executable...
call npm run createexe
if %errorlevel% neq 0 (
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo 🎨 Adding logo to executable...
node -e "const rcedit = require('rcedit'); const fs = require('fs'); const files = fs.readdirSync('dist').filter(f => f.endsWith('.exe')); files.forEach(f => rcedit('dist/' + f, { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added to', f)));"

echo.
echo 🔄 Refreshing Windows icon cache...
ie4uinit.exe -show

echo.
echo 📁 Opening dist folder...
explorer.exe "dist"

echo.
echo ✅ Build complete with logo!
echo 💡 Right-click on .exe file and select Properties to verify logo
echo.
pause
