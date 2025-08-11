const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class ConsoleManager {
    constructor() {
        this.isVisible = true;
        this.pidFile = path.join(process.cwd(), 'app.pid');
    }

    // Check if app is already running
    isAppRunning() {
        try {
            if (fs.existsSync(this.pidFile)) {
                const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
                process.kill(pid, 0); // Check if process exists
                return true;
            }
        } catch (error) {
            // Process doesn't exist, clean up
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
                
                if (process.platform === 'win32') {
                    exec(`taskkill /PID ${pid} /F`, () => {
                        this.cleanup();
                    });
                } else {
                    process.kill(pid, 'SIGTERM');
                }
                
                // Wait for cleanup
                setTimeout(() => {}, 1000);
            }
        } catch (error) {
            console.log('No existing instance found');
            this.cleanup();
        }
    }

    // Hide console window after startup
    hideConsole() {
        if (process.pkg && process.platform === 'win32') {
            console.log('🔒 Minimizing console window...');
            
            // Use PowerShell to minimize the current console window
            const script = `
                Add-Type -TypeDefinition '
                    using System;
                    using System.Runtime.InteropServices;
                    public class Win32 {
                        [DllImport("kernel32.dll")]
                        public static extern IntPtr GetConsoleWindow();
                        [DllImport("user32.dll")]
                        public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
                        public const int SW_HIDE = 0;
                        public const int SW_MINIMIZE = 6;
                    }
                ';
                $consolePtr = [Win32]::GetConsoleWindow();
                [Win32]::ShowWindow($consolePtr, 6);
            `;
            
            exec(`powershell -WindowStyle Hidden -Command "${script}"`, (error) => {
                if (error) {
                    console.log('Console minimization attempted');
                }
            });
            
            this.isVisible = false;
        }
    }

    // Show startup messages with timing
    showStartupSequence() {
        console.log('🚀 Starting Desktop Application...');
        console.log('🔧 Initializing system...');
        
        setTimeout(() => {
            console.log('📊 Loading application modules...');
        }, 500);
        
        setTimeout(() => {
            console.log('🌐 Starting server...');
        }, 1000);
    }

    // Hide console after server starts
    hideAfterStartup() {
        setTimeout(() => {
            console.log('✅ Application started successfully!');
            console.log('🔒 Minimizing console window in 2 seconds...');
            
            setTimeout(() => {
                this.hideConsole();
            }, 2000);
        }, 1500);
    }

    // Record this process
    recordProcess() {
        try {
            fs.writeFileSync(this.pidFile, process.pid.toString());
        } catch (error) {
            // Ignore write errors
        }
    }

    // Cleanup on exit
    cleanup() {
        try {
            if (fs.existsSync(this.pidFile)) {
                fs.unlinkSync(this.pidFile);
            }
        } catch (error) {
            // Ignore cleanup errors
        }
    }

    // Initialize the console manager
    init() {
        // Check for existing instance
        if (this.isAppRunning()) {
            console.log('🔄 Application already running. Restarting...');
            this.stopExisting();
            // Small delay before continuing
            setTimeout(() => this.startNewInstance(), 1500);
        } else {
            this.startNewInstance();
        }
    }

    startNewInstance() {
        this.recordProcess();
        this.showStartupSequence();
        this.hideAfterStartup();
        
        // Handle cleanup on exit
        process.on('exit', () => this.cleanup());
        process.on('SIGINT', () => {
            console.log('🔴 Shutting down...');
            this.cleanup();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            this.cleanup();
            process.exit(0);
        });
    }
}

module.exports = ConsoleManager;
