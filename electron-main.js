const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
    // Create the browser window
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        },
        icon: path.join(__dirname, 'icon.png'), // Optional: add your app icon
        title: 'Billing Management System'
    });

    // Start the Express server
    startServer();
    
    // Load the app after a short delay to ensure server is ready
    setTimeout(() => {
        mainWindow.loadURL('http://localhost:3000');
    }, 3000);

    // Open DevTools in development (remove for production)
    // mainWindow.webContents.openDevTools();
}

function startServer() {
    // Start the Express server
    serverProcess = spawn('node', ['server.js'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    serverProcess.on('error', (error) => {
        console.error('Failed to start server:', error);
    });
}

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
    // Kill the server process
    if (serverProcess) {
        serverProcess.kill();
    }
    
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Kill server when app is about to quit
app.on('before-quit', () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});
