/**
 * Test script to verify license directory paths for both desktop and web modes
 */

const path = require('path');
const os = require('os');

// Simulate desktop mode
console.log('=== DESKTOP MODE ===');
const APP_TYPE_DESKTOP = 'desktop';
const COMPANY_NAME_FOLDER = 'RahmanPOC';

function getLicenseDirDesktop() {
    const appDataPath = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appDataPath, COMPANY_NAME_FOLDER, 'license');
}

console.log('Desktop License Directory:', getLicenseDirDesktop());

// Simulate web mode
console.log('\n=== WEB MODE ===');
const APP_TYPE_WEB = 'web';

function getLicenseDirWeb() {
    return path.join(process.cwd(), 'license');
}

console.log('Web License Directory:', getLicenseDirWeb());

console.log('\n=== COMPARISON ===');
console.log('Desktop creates license folder in user AppData');
console.log('Web creates license folder in application directory');
