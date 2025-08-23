/**
 * Test script to verify license handling scenarios
 */

const fs = require('fs');
const path = require('path');

// Clean up any existing license first
console.log('=== Cleaning up existing license ===');

const licenseManager = require('./utils/licenseManager');
const licenseDir = licenseManager.getLicenseDir();
const licenseFile = path.join(licenseDir, 'current.lic');
const stateFile = path.join(licenseDir, '.license-state');

// Remove license files if they exist
if (fs.existsSync(licenseFile)) {
    fs.unlinkSync(licenseFile);
    console.log('✅ Removed existing license file');
}

if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
    console.log('✅ Removed existing license state file');
}

console.log('\n=== Scenario 1: Fresh Installation (No License) ===');
console.log('License exists:', licenseManager.licenseExists());
console.log('Manually deleted:', licenseManager.isLicenseManuallyDeleted());

// Create default license
console.log('\n=== Creating Default License ===');
licenseManager.createDefaultLicense();

console.log('\n=== Scenario 2: Valid License ===');
console.log('License exists:', licenseManager.licenseExists());
const validation1 = licenseManager.validateLicense();
console.log('Validation result:', validation1.isValid ? 'Valid' : 'Invalid');
console.log('Reason:', validation1.reason || 'N/A');

console.log('\n=== Scenario 3: Manual License Deletion ===');
// Delete the license file to simulate tampering
if (fs.existsSync(licenseFile)) {
    fs.unlinkSync(licenseFile);
    console.log('✅ Manually deleted license file');
}

console.log('License exists:', licenseManager.licenseExists());
console.log('Manually deleted:', licenseManager.isLicenseManuallyDeleted());

const validation2 = licenseManager.validateLicense();
console.log('Validation result:', validation2.isValid ? 'Valid' : 'Invalid');
console.log('Reason:', validation2.reason);
console.log('Is expired flag:', validation2.isExpired);
console.log('Manually deleted flag:', validation2.isManuallyDeleted);

console.log('\n=== Test Complete ===');
console.log('Both scenarios should show as expired/invalid and block access.');
