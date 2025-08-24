const fs = require('fs');
const path = require('path');

// Safe Logo Embedding Script
console.log('🎨 Safe Logo Embedding for Kanakkar Executable');
console.log('================================================');

async function embedLogoSafely() {
    try {
        // Check if executable exists
        const exeFiles = fs.readdirSync('dist').filter(f => f.endsWith('.exe') && !f.includes('BACKUP'));
        
        if (exeFiles.length === 0) {
            console.log('❌ No executable files found in dist folder');
            return false;
        }
        
        // Check if logo exists
        if (!fs.existsSync('assets/logo.ico')) {
            console.log('❌ Logo file not found: assets/logo.ico');
            return false;
        }
        
        console.log(`📁 Found executables: ${exeFiles.join(', ')}`);
        console.log('🎨 Logo file: assets/logo.ico');
        
        for (const exeFile of exeFiles) {
            const exePath = path.join('dist', exeFile);
            const backupPath = path.join('dist', exeFile.replace('.exe', '_BACKUP_BEFORE_LOGO.exe'));
            
            console.log(`\n🔄 Processing: ${exeFile}`);
            
            // Create backup before modifying
            console.log('💾 Creating backup...');
            fs.copyFileSync(exePath, backupPath);
            
            // Get original file stats
            const originalStats = fs.statSync(exePath);
            console.log(`📊 Original size: ${originalStats.size} bytes`);
            
            try {
                // Import rcedit dynamically
                const rcedit = require('rcedit');
                
                console.log('🔧 Embedding logo...');
                await rcedit(exePath, {
                    icon: 'assets/logo.ico'
                });
                
                // Verify the file still works by checking size
                const newStats = fs.statSync(exePath);
                console.log(`📊 New size: ${newStats.size} bytes`);
                
                if (newStats.size === 0) {
                    throw new Error('File became corrupted (0 bytes)');
                }
                
                console.log('✅ Logo embedded successfully!');
                console.log('🗑️ Removing backup (operation successful)');
                fs.unlinkSync(backupPath);
                
            } catch (error) {
                console.log(`❌ Error embedding logo: ${error.message}`);
                console.log('🔄 Restoring from backup...');
                
                // Restore from backup
                if (fs.existsSync(backupPath)) {
                    fs.copyFileSync(backupPath, exePath);
                    fs.unlinkSync(backupPath);
                    console.log('✅ Original file restored');
                } else {
                    console.log('❌ Backup not found - file may be corrupted');
                }
                
                return false;
            }
        }
        
        return true;
        
    } catch (error) {
        console.log(`❌ Fatal error: ${error.message}`);
        return false;
    }
}

// Run the safe embedding
embedLogoSafely().then(success => {
    if (success) {
        console.log('\n🎉 Logo embedding completed successfully!');
        console.log('💡 Test your executable to ensure it still works');
        console.log('🔍 Right-click → Properties to verify logo appears');
    } else {
        console.log('\n⚠️ Logo embedding failed - executable should still work');
        console.log('💡 You can try alternative logo formats or rcedit versions');
    }
}).catch(error => {
    console.log(`\n💥 Unexpected error: ${error.message}`);
});
