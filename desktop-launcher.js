const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Billing System Desktop Application...');

// First start the server
const serverProcess = spawn('node', ['server.js'], {
    cwd: __dirname,
    stdio: 'pipe'
});

serverProcess.stdout.on('data', (data) => {
    console.log(data.toString());
});

serverProcess.stderr.on('data', (data) => {
    console.error(data.toString());
});

// Wait for server to start, then launch electron
setTimeout(() => {
    console.log('🖥️ Launching desktop interface...');
    
    const electronProcess = spawn('npx', ['electron', 'electron-main.js'], {
        cwd: __dirname,
        stdio: 'inherit',
        shell: true
    });

    electronProcess.on('close', (code) => {
        console.log('🔴 Application closed');
        serverProcess.kill();
        process.exit(0);
    });

    electronProcess.on('error', (error) => {
        console.error('❌ Error starting desktop interface:', error);
        console.log('🌐 Falling back to browser mode...');
        
        // Fallback to browser
        const { exec } = require('child_process');
        setTimeout(() => {
            exec('start http://localhost:3000', (error) => {
                if (error) {
                    console.log('Please manually open: http://localhost:3000');
                }
            });
        }, 2000);
    });

}, 3000);

// Handle cleanup
process.on('SIGINT', () => {
    console.log('🔴 Shutting down...');
    serverProcess.kill();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🔴 Shutting down...');
    serverProcess.kill();
    process.exit(0);
});
