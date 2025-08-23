/**
 * License Management System
 * Handles license generation and validation (simplified - no machine binding)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const appConfig = require('./app-config');

// License configuration
const LICENSE_SECRET = 'vikram-steels-license-secret-2025'; // In production, use environment variable
const LICENSE_DIR = path.join(process.cwd(), 'license');
const LICENSE_FILE = path.join(LICENSE_DIR, 'current.lic');

/**
 * Ensure license directory exists
 */
function ensureLicenseDir() {
    if (!fs.existsSync(LICENSE_DIR)) {
        fs.mkdirSync(LICENSE_DIR, { recursive: true });
        console.log('📁 License directory created:', LICENSE_DIR);
    }
}

/**
 * Generate a new license (simplified - no hardware binding)
 * @param {Object} options - License options
 * @param {string} options.companyName - Company name for the license
 * @param {number} options.validityDays - Number of days the license is valid
 * @param {string} options.licenseType - Type of license (default, generated, etc.)
 * @returns {Object} Generated license data
 */
function generateLicense(options) {
    const {
        companyName = appConfig.getLicenseAppName(),
        validityDays = 45,
        licenseType = 'generated'
    } = options;
    
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (validityDays * 24 * 60 * 60 * 1000));
    
    const licenseData = {
        licenseId: `LIC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        appName: appConfig.getLicenseAppName(),
        companyName: companyName,
        licenseType: licenseType,
        issuedDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        validityDays: validityDays,
        version: '1.0',
        features: ['billing', 'inventory', 'customers', 'reports', 'settings']
    };
    
    return licenseData;
}

/**
 * Save license to file (encrypted)
 * @param {Object} licenseData - License data to save
 * @param {string} filename - Optional filename (defaults to current.lic)
 */
function saveLicense(licenseData, filename = 'current.lic') {
    try {
        ensureLicenseDir();
        
        // Sign the license with JWT
        let jwtOptions = { algorithm: 'HS256' };
        
        if (licenseData.validityDays > 0) {
            // Normal license - set expiration
            jwtOptions.expiresIn = `${licenseData.validityDays}d`;
        } else {
            // Expired license for testing - don't set JWT expiration
            console.log('⚠️ Saving expired license for testing - JWT will not have expiration');
        }
        
        const signedLicense = jwt.sign(licenseData, LICENSE_SECRET, jwtOptions);
        
        const filePath = path.join(LICENSE_DIR, filename);
        fs.writeFileSync(filePath, signedLicense);
        
        console.log(`💾 License saved: ${filename}`);
        return true;
    } catch (error) {
        console.error('Error saving license:', error);
        return false;
    }
}

/**
 * Load and verify license from file
 * @param {string} filename - Optional filename (defaults to current.lic)
 * @returns {Object|null} License data or null if invalid
 */
function loadLicense(filename = 'current.lic') {
    try {
        const filePath = path.join(LICENSE_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return null;
        }
        
        const signedLicense = fs.readFileSync(filePath, 'utf8');
        const licenseData = jwt.verify(signedLicense, LICENSE_SECRET);
        
        return licenseData;
    } catch (error) {
        console.error('Error loading license:', error);
        return null;
    }
}

/**
 * Activate license (simplified - only validates company name match)
 * @param {Object} licenseData - License data to activate
 * @returns {Object|null} Activated license or null if failed
 */
function activateLicense(licenseData) {
    try {
        // Check if company name matches the expected app name
        const expectedCompanyName = appConfig.getLicenseAppName();
        if (licenseData.companyName !== expectedCompanyName) {
            throw new Error(`License company name "${licenseData.companyName}" does not match expected "${expectedCompanyName}"`);
        }
        
        // Check if license is still valid (allow expired licenses for testing)
        const now = new Date();
        const expiryDate = new Date(licenseData.expiryDate);
        
        if (now > expiryDate) {
            console.log('⚠️ Activating expired license for testing purposes');
        }
        
        // Save license directly (no hardware binding needed)
        if (saveLicense(licenseData)) {
            console.log(`✅ License activated for: ${licenseData.companyName}`);
            return licenseData;
        }
        
        return null;
    } catch (error) {
        console.error('Error activating license:', error);
        return null;
    }
}

/**
 * Validate current license
 * @returns {Object} Validation result
 */
function validateLicense() {
    try {
        const license = loadLicense();
        
        if (!license) {
            return {
                isValid: false,
                reason: 'No license found',
                needsDefault: true
            };
        }
        
        // Check company name matches expected app name
        const expectedCompanyName = appConfig.getLicenseAppName();
        if (license.companyName !== expectedCompanyName) {
            return {
                isValid: false,
                reason: `License company name "${license.companyName}" does not match expected "${expectedCompanyName}"`,
                license: license
            };
        }
        
        // Check expiry
        const now = new Date();
        const expiryDate = new Date(license.expiryDate);
        
        if (now > expiryDate) {
            return {
                isValid: false,
                reason: 'License expired',
                license: license,
                daysExpired: Math.ceil((now - expiryDate) / (1000 * 60 * 60 * 24))
            };
        }
        
        // Calculate days remaining
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        return {
            isValid: true,
            license: license,
            daysRemaining: daysRemaining,
            isExpiringSoon: daysRemaining <= 30,
            warningLevel: daysRemaining <= 7 ? 'critical' : daysRemaining <= 30 ? 'warning' : 'ok'
        };
    } catch (error) {
        console.error('Error validating license:', error);
        return {
            isValid: false,
            reason: 'Validation error',
            error: error.message
        };
    }
}

/**
 * Create default 45-day license for new installations
 */
function createDefaultLicense() {
    try {
        console.log('🆕 Creating default 45-day license...');
        
        const defaultLicense = generateLicense({
            companyName: appConfig.getLicenseAppName(),
            validityDays: 45,
            licenseType: 'default'
        });
        
        // Auto-activate the default license
        const activatedLicense = activateLicense(defaultLicense);
        
        if (activatedLicense) {
            console.log('✅ Default license created and activated');
            console.log(`   Valid until: ${new Date(activatedLicense.expiryDate).toLocaleDateString()}`);
            return activatedLicense;
        } else {
            console.error('❌ Failed to activate default license');
            return null;
        }
    } catch (error) {
        console.error('Error creating default license:', error);
        return null;
    }
}

/**
 * Check if license exists
 * @returns {boolean} True if license file exists
 */
function licenseExists() {
    return fs.existsSync(LICENSE_FILE);
}

/**
 * Get license info for dashboard
 * @returns {Object} License information for display
 */
function getLicenseInfo() {
    const validation = validateLicense();
    
    if (!validation.isValid) {
        return {
            status: 'invalid',
            message: validation.reason,
            showWarning: true,
            needsUpload: true
        };
    }
    
    const license = validation.license;
    const daysRemaining = validation.daysRemaining;
    
    return {
        status: 'valid',
        companyName: license.companyName,
        licenseType: license.licenseType,
        issuedDate: new Date(license.issuedDate).toLocaleDateString(),
        expiryDate: new Date(license.expiryDate).toLocaleDateString(),
        daysRemaining: daysRemaining,
        isExpiringSoon: validation.isExpiringSoon,
        warningLevel: validation.warningLevel,
        showWarning: validation.isExpiringSoon,
        features: license.features || []
    };
}

module.exports = {
    generateLicense,
    saveLicense,
    loadLicense,
    activateLicense,
    validateLicense,
    createDefaultLicense,
    licenseExists,
    getLicenseInfo,
    ensureLicenseDir,
    LICENSE_DIR
};
