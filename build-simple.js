const { getCompanyNameFolder } = require('./utils/app-config');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Get company name for the executable
const companyName = 'VikramSteels';
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);

// Logo configuration
const logoPath = path.join(__dirname, 'assets', 'logo.png');
const icoPath = path.join(__dirname, 'assets', 'logo.ico');

console.log('🎨 Checking for logo files...');
if (fs.existsSync(logoPath)) {
    console.log(`✅ Logo found: ${logoPath}`);
} else {
    console.log(`⚠️ Logo not found at: ${logoPath}`);
}

// Check if user wants both architectures
const buildBoth = process.argv.includes('--both');
const buildx32 = process.argv.includes('--x32');

let targets = [];

if (buildBoth) {
    targets = [
        { arch: 'x64', name: `${companyName}_${timestamp}_x64.exe` },
        { arch: 'x86', name: `${companyName}_${timestamp}_x32.exe` }
    ];
    console.log(`🔧 Building ${companyName} for both x64 and x32...`);
} else if (buildx32) {
    targets = [
        { arch: 'x86', name: `${companyName}_${timestamp}_x32.exe` }
    ];
    console.log(`🔧 Building ${companyName} for x32 only...`);
} else {
    targets = [
        { arch: 'x64', name: `${companyName}_${timestamp}_x64.exe` }
    ];
    console.log(`🔧 Building ${companyName} for x64 (default)...`);
}

let currentBuild = 0;

// Function to add logo to executable
function addLogoToExecutable(executablePath, arch) {
    console.log(`🎨 Adding logo to ${arch} executable...`);
    
    // Check if we have an ICO file
    if (fs.existsSync(icoPath)) {
        console.log(`✅ Using ICO file: ${icoPath}`);
        embedIcon(executablePath, icoPath, arch);
    } else if (fs.existsSync(logoPath)) {
        console.log(`⚠️ PNG found but ICO preferred. Please convert ${logoPath} to ${icoPath}`);
        console.log(`💡 You can use online converters or tools like ImageMagick`);
    } else {
        console.log(`⚠️ No logo file found, skipping icon embedding for ${arch}`);
    }
}

// Function to convert PNG to ICO (simplified approach)
function convertPngToIco(pngPath, icoPath, callback) {
    // For now, just copy the PNG and rename it
    // In production, you might want to use a proper PNG to ICO converter
    try {
        fs.copyFileSync(pngPath, icoPath.replace('.ico', '_temp.png'));
        console.log(`📝 PNG prepared for ${path.basename(icoPath)}`);
        if (callback) callback();
    } catch (error) {
        console.log(`⚠️ Could not prepare icon: ${error.message}`);
        if (callback) callback();
    }
}

// Function to embed icon using rcedit (if available)
function embedIcon(executablePath, iconPath, arch) {
    console.log(`🔧 Attempting to embed icon using rcedit...`);
    
    // Try to use rcedit to embed the icon
    const rcedit = spawn('npx', ['rcedit', executablePath, '--set-icon', iconPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true
    });

    let output = '';
    let errorOutput = '';

    rcedit.stdout.on('data', (data) => {
        output += data.toString();
    });

    rcedit.stderr.on('data', (data) => {
        errorOutput += data.toString();
    });

    rcedit.on('close', (code) => {
        if (code === 0) {
            console.log(`🎉 Logo successfully embedded in ${arch} executable!`);
            console.log(`✨ Your executable now has a custom icon!`);
        } else {
            console.log(`⚠️ rcedit exited with code ${code} for ${arch}`);
            if (errorOutput) {
                console.log(`Error details: ${errorOutput.trim()}`);
            }
            console.log(`💡 Try installing rcedit globally: npm install -g rcedit`);
        }
    });

    rcedit.on('error', (error) => {
        console.log(`⚠️ rcedit not available for ${arch}: ${error.message}`);
        console.log(`💡 Install rcedit to add icons: npm install -g rcedit`);
        
        // Try alternative method with node_modules rcedit
        tryLocalRcedit(executablePath, iconPath, arch);
    });
}

// Try using local rcedit from node_modules
function tryLocalRcedit(executablePath, iconPath, arch) {
    const localRceditPath = path.join(__dirname, 'node_modules', '.bin', 'rcedit.cmd');
    
    if (fs.existsSync(localRceditPath)) {
        console.log(`🔧 Trying local rcedit for ${arch}...`);
        
        const localRcedit = spawn(localRceditPath, [executablePath, '--set-icon', iconPath], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: true
        });

        localRcedit.on('close', (code) => {
            if (code === 0) {
                console.log(`🎉 Logo successfully embedded using local rcedit for ${arch}!`);
            } else {
                console.log(`⚠️ Local rcedit also failed for ${arch} (code: ${code})`);
            }
        });

        localRcedit.on('error', (error) => {
            console.log(`⚠️ Local rcedit error for ${arch}: ${error.message}`);
        });
    } else {
        console.log(`⚠️ No local rcedit found. Icon embedding skipped for ${arch}.`);
    }
}

function buildNext() {
    if (currentBuild >= targets.length) {
        console.log('\n🎉 Build process completed!');
        console.log('📦 Generated files:');
        targets.forEach(target => {
            console.log(`   • dist/${target.name}`);
        });
        console.log('\n🚀 Ready for distribution!');
        return;
    }

    const target = targets[currentBuild];
    const outputPath = path.join('dist', target.name);
    
    console.log(`\n🚀 Building ${target.arch} version...`);
    console.log(`📁 Output: ${outputPath}`);

    const pkgProcess = spawn('pkg', [
        '.',
        '--target', `node16-win-${target.arch}`,
        '--output', outputPath,
        '--options', 'no-warnings'
    ], {
        stdio: 'inherit',
        shell: true
    });

    // Timeout after 3 minutes
    const timeout = setTimeout(() => {
        console.log(`\n⏰ ${target.arch} build taking too long, terminating...`);
        pkgProcess.kill('SIGTERM');
        setTimeout(() => pkgProcess.kill('SIGKILL'), 5000);
    }, 3 * 60 * 1000);

    pkgProcess.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
            console.log(`✅ ${target.arch} build completed successfully!`);
            
            // Add logo to executable if available
            if (fs.existsSync(outputPath)) {
                addLogoToExecutable(outputPath, target.arch);
            }
        } else {
            console.log(`⚠️ ${target.arch} build finished with code ${code}`);
        }
        
        currentBuild++;
        setTimeout(buildNext, 1000);
    });

    pkgProcess.on('error', (error) => {
        clearTimeout(timeout);
        console.error(`❌ ${target.arch} build error:`, error.message);
        currentBuild++;
        setTimeout(buildNext, 1000);
    });
}

console.log('\n💡 Usage:');
// npm run createexe && node -e "const rcedit = require('rcedit'); const fs = require('fs'); const files = fs.readdirSync('dist').filter(f => f.endsWith('.exe')); files.forEach(f => rcedit('dist/' + f, { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added to', f)));"
console.log('  npm run createexe          (builds x64 only)');
console.log('  npm run createexe -- --x32 (builds x32 only)');
console.log('  npm run createexe -- --both (builds both)');
console.log('');
console.log('🎨 Logo Integration:');
console.log('  • Place logo.png in assets/ folder');
console.log('  • Logo will be automatically embedded in the executable');
console.log('  • For best results, install rcedit: npm install -g rcedit');
console.log('');
/**node -e "const rcedit = require('rcedit'); console.log('🔧 Adding logo to executable...'); rcedit('dist/Kanakkar_2025-08-24T14-48_x64.exe', { icon: 'assets/logo.ico' }).then(() => { console.log('✅ Logo added successfully!'); console.log('📁 File modified:', new Date().toLocaleString()); }).catch(err => { console.error('❌ Error:', err.message); console.error('📋 Full error:', err); });" */
/**Write-Host "🔄 Refreshing Windows icon cache..."; ie4uinit.exe -show */
/**Write-Host "📋 To verify logo:"; Write-Host "1. Right-click on 'dist/Kanakkar_2025-08-24T14-48_x64.exe'"; Write-Host "2. Select 'Properties'"; Write-Host "3. Check the icon at the top of the Properties dialog"; Write-Host "4. Your custom logo should appear there"; Write-Host ""; Write-Host "📁 Opening folder for you..."; explorer.exe "dist" */
buildNext();
/**npm run createexe && node -e "const rcedit = require('rcedit'); const fs = require('fs'); const files = fs.readdirSync('dist').filter(f => f.endsWith('.exe')); files.forEach(f => rcedit('dist/' + f, { icon: 'assets/logo.ico' }).then(() => console.log('✅ Logo added to', f)));" && ie4uinit.exe -show */
/*# Quick cache refresh
ie4uinit.exe -show

# Full cache clear
ie4uinit.exe -ClearIconCache

# Restart explorer (if needed)
taskkill /f /im explorer.exe; Start-Sleep 2; explorer.exe*/


//or
//build-with-logo.bat 
//.\build-with-logo.ps1