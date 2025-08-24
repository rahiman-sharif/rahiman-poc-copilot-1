/**
 * Secure License Manager with RSA Encryption
 * Uses public/private key cryptography for tamper-proof licenses
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// RSA Key Pair (In production, private key should be kept secret on license server)
const RSA_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQC8xKGH7V+XzLQP
... (truncated for security - generate your own key pair)
-----END PRIVATE KEY-----`;

const RSA_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAvMShh+1fl8y0D...
... (truncated - this goes in your app)
-----END PUBLIC KEY-----`;

/**
 * Generate machine fingerprint for hardware binding
 */
function getMachineFingerprint() {
    try {
        const networkInterfaces = os.networkInterfaces();
        const cpuInfo = os.cpus()[0];
        
        // Create machine-specific fingerprint
        const machineData = {
            platform: os.platform(),
            arch: os.arch(),
            cpuModel: cpuInfo.model,
            cpuCores: os.cpus().length,
            totalMemory: os.totalmem(),
            hostname: os.hostname(),
            // Get primary network interface MAC
            primaryMac: Object.values(networkInterfaces)
                .flat()
                .find(iface => !iface.internal && iface.mac !== '00:00:00:00:00:00')
                ?.mac || 'unknown'
        };
        
        return crypto.createHash('sha256')
            .update(JSON.stringify(machineData))
            .digest('hex')
            .substring(0, 16); // Use first 16 chars
    } catch (error) {
        console.error('Error generating machine fingerprint:', error);
        return 'fallback-fingerprint';
    }
}

/**
 * Generate secure license with machine binding
 */
function generateSecureLicense(options) {
    const {
        companyName,
        validityDays = 45,
        machineFingerprint = null
    } = options;
    
    const now = new Date();
    const expiryDate = new Date(now.getTime() + (validityDays * 24 * 60 * 60 * 1000));
    
    const licenseData = {
        licenseId: `LIC-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        companyName: companyName,
        issuedDate: now.toISOString(),
        expiryDate: expiryDate.toISOString(),
        machineFingerprint: machineFingerprint || getMachineFingerprint(),
        version: '2.0',
        checksum: '' // Will be calculated
    };
    
    // Create checksum to prevent tampering
    const dataForChecksum = `${licenseData.companyName}${licenseData.expiryDate}${licenseData.machineFingerprint}`;
    licenseData.checksum = crypto.createHash('sha256').update(dataForChecksum).digest('hex').substring(0, 16);
    
    return licenseData;
}

/**
 * Sign license with RSA private key (only on license server)
 */
function signLicense(licenseData) {
    try {
        const dataToSign = JSON.stringify(licenseData);
        const signature = crypto.sign('sha256', Buffer.from(dataToSign), RSA_PRIVATE_KEY);
        
        return {
            license: licenseData,
            signature: signature.toString('base64')
        };
    } catch (error) {
        console.error('Error signing license:', error);
        throw error;
    }
}

/**
 * Verify license signature with RSA public key (in app)
 */
function verifyLicense(licenseData, signature) {
    try {
        const dataToVerify = JSON.stringify(licenseData);
        const isValid = crypto.verify(
            'sha256', 
            Buffer.from(dataToVerify), 
            RSA_PUBLIC_KEY, 
            Buffer.from(signature, 'base64')
        );
        
        return isValid;
    } catch (error) {
        console.error('Error verifying license:', error);
        return false;
    }
}

/**
 * Validate secure license with all checks
 */
function validateSecureLicense(signedLicense) {
    try {
        const { license, signature } = JSON.parse(signedLicense);
        
        // 1. Verify RSA signature
        if (!verifyLicense(license, signature)) {
            return {
                isValid: false,
                reason: 'Invalid license signature - license has been tampered with'
            };
        }
        
        // 2. Verify machine fingerprint
        const currentFingerprint = getMachineFingerprint();
        if (license.machineFingerprint !== currentFingerprint) {
            return {
                isValid: false,
                reason: 'License is bound to a different machine',
                details: `Expected: ${license.machineFingerprint}, Current: ${currentFingerprint}`
            };
        }
        
        // 3. Verify checksum
        const dataForChecksum = `${license.companyName}${license.expiryDate}${license.machineFingerprint}`;
        const expectedChecksum = crypto.createHash('sha256').update(dataForChecksum).digest('hex').substring(0, 16);
        
        if (license.checksum !== expectedChecksum) {
            return {
                isValid: false,
                reason: 'License data integrity check failed - license has been modified'
            };
        }
        
        // 4. Check expiry
        const now = new Date();
        const expiryDate = new Date(license.expiryDate);
        
        if (now > expiryDate) {
            return {
                isValid: false,
                reason: 'License expired',
                isExpired: true,
                license: license
            };
        }
        
        return {
            isValid: true,
            license: license,
            daysRemaining: Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24))
        };
        
    } catch (error) {
        return {
            isValid: false,
            reason: 'License format error - corrupted license file'
        };
    }
}

module.exports = {
    generateSecureLicense,
    signLicense,
    verifyLicense,
    validateSecureLicense,
    getMachineFingerprint
};
