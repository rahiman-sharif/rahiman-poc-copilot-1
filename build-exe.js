const { getCompanyNameFolder } = require('./utils/app-config');
const { spawn } = require('child_process');
const path = require('path');

// Get company name for the executable
const companyName = getCompanyNameFolder();
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);

// Define both architectures
const targets = [
    { arch: 'x64', name: `${companyName}_${timestamp}_x64.exe` },
    { arch: 'x86', name: `${companyName}_${timestamp}_x32.exe` }
];

console.log(`🔧 Building ${companyName} executable for both architectures...`);

// Function to build for a specific target
function buildTarget(target) {
    return new Promise((resolve, reject) => {
        const outputPath = path.join('dist', target.name);
        console.log(`� Building ${target.arch}: ${outputPath}`);
        
        const pkgProcess = spawn('pkg', [
            '.',
            '--target', `node16-win-${target.arch}`,
            '--output', outputPath,
            '--options', 'no-warnings'
        ], {
            stdio: 'inherit',
            shell: true
        });

        pkgProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${target.arch} build completed: ${target.name}`);
                resolve();
            } else {
                console.error(`❌ ${target.arch} build failed with code ${code}`);
                reject(new Error(`Build failed for ${target.arch}`));
            }
        });

        pkgProcess.on('error', (error) => {
            console.error(`❌ ${target.arch} build error:`, error);
            reject(error);
        });
    });
}

// Build both targets sequentially
async function buildAll() {
    try {
        for (const target of targets) {
            await buildTarget(target);
        }
        
        console.log('\n🎉 All builds completed successfully!');
        console.log('📁 Generated files:');
        targets.forEach(target => {
            console.log(`   📦 ${target.name} (${target.arch})`);
        });
        console.log('\n🚀 Ready for distribution!');
        
    } catch (error) {
        console.error('❌ Build process failed:', error.message);
        process.exit(1);
    }
}

// Start the build process
buildAll();
