const { getCompanyNameFolder } = require('./utils/app-config');
const { spawn } = require('child_process');
const path = require('path');

// Get company name for the executable
const companyName = getCompanyNameFolder();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);

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
console.log('  npm run createexe          (builds x64 only)');
console.log('  npm run createexe -- --x32 (builds x32 only)');
console.log('  npm run createexe -- --both (builds both)');
console.log('');

buildNext();
