const fs = require('fs');
const path = require('path');

// Test if icon was embedded by checking file size difference
const exePath = 'dist/Kanakkar_2025-08-24T14-48_x64.exe';
const iconPath = 'assets/logo.ico';

if (fs.existsSync(exePath) && fs.existsSync(iconPath)) {
    const exeStats = fs.statSync(exePath);
    const iconStats = fs.statSync(iconPath);
    
    console.log('📁 Executable size:', exeStats.size, 'bytes');
    console.log('🎨 Icon size:', iconStats.size, 'bytes');
    console.log('📅 Executable modified:', exeStats.mtime);
    console.log('📅 Icon modified:', iconStats.mtime);
    
    // Check if executable was modified after icon
    if (exeStats.mtime > iconStats.mtime) {
        console.log('✅ Executable was modified after icon file - logo likely embedded');
    } else {
        console.log('⚠️ Executable older than icon file - logo might not be embedded');
    }
    
    // Try to read some metadata
    console.log('\n🔍 File Properties:');
    console.log('Executable path:', path.resolve(exePath));
    
} else {
    console.log('❌ Files not found');
    console.log('Exe exists:', fs.existsSync(exePath));
    console.log('Icon exists:', fs.existsSync(iconPath));
}
