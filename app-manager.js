const fs = require('fs');
const path = require('path');
const { spawn, exec } = require('child_process');

class ProcessManager {
    constructor() {
        this.pidFile = path.join(process.cwd(), 'app.pid');
        this.logFile = path.join(process.cwd(), 'app.log');
        this.serverProcess = null;
    }

    // Check if app is already running
    isRunning() {
        try {
            if (fs.existsSync(this.pidFile)) {
                const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
                // Check if process with this PID exists
                process.kill(pid, 0);
                return true;
            }
        } catch (error) {
            // Process doesn't exist, clean up stale pid file
            this.cleanup();
        }
        return false;
    }

    // Stop existing instance
    stopExisting() {
        try {
            if (fs.existsSync(this.pidFile)) {
                const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
                console.log(`🔄 Stopping existing instance (PID: ${pid})...`);
                
                // Kill the process
                if (process.platform === 'win32') {
                    exec(`taskkill /PID ${pid} /F`, () => {
                        this.cleanup();
                    });
                } else {
                    process.kill(pid, 'SIGTERM');
                    this.cleanup();
                }
                
                // Wait a moment for cleanup
                return new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.log('No existing instance to stop');
            this.cleanup();
        }
        return Promise.resolve();
    }

    // Start the application
    async start() {
        // Check if already running
        if (this.isRunning()) {
            console.log('🔄 Application already running. Restarting...');
            await this.stopExisting();
        }

        console.log('🚀 Starting Billing System Desktop Application...');
        
        // Write our PID
        fs.writeFileSync(this.pidFile, process.pid.toString());
        
        // Start the server
        this.startServer();
        
        // Handle cleanup on exit
        process.on('exit', () => this.cleanup());
        process.on('SIGINT', () => this.gracefulShutdown());
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('uncaughtException', (error) => {
            console.error('Uncaught Exception:', error);
            this.gracefulShutdown();
        });
    }

    startServer() {
        console.log('🔧 Starting server...');
        
        this.serverProcess = spawn('node', ['server.js'], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });

        // Log server output
        this.serverProcess.stdout.on('data', (data) => {
            const message = data.toString();
            console.log(message);
            this.logToFile(message);
        });

        this.serverProcess.stderr.on('data', (data) => {
            const message = data.toString();
            console.error(message);
            this.logToFile(`ERROR: ${message}`);
        });

        this.serverProcess.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
            if (code !== 0) {
                console.log('Server crashed, cleaning up...');
                this.cleanup();
                process.exit(1);
            }
        });

        this.serverProcess.on('error', (error) => {
            console.error('Failed to start server:', error);
            this.cleanup();
            process.exit(1);
        });

        console.log(`📊 Server started with PID: ${this.serverProcess.pid}`);
    }

    logToFile(message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${message}\n`;
        fs.appendFileSync(this.logFile, logEntry);
    }

    cleanup() {
        try {
            if (fs.existsSync(this.pidFile)) {
                fs.unlinkSync(this.pidFile);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    gracefulShutdown() {
        console.log('🔴 Shutting down gracefully...');
        
        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
        }
        
        this.cleanup();
        process.exit(0);
    }
}

// Start the application
const manager = new ProcessManager();
manager.start();
