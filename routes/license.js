/**
 * License Management Routes
 * Handles license generation (super admin) and license upload (users)
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const licenseManager = require('../utils/licenseManager');
const appConfig = require('../utils/app-config');

// Configure multer for license file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.lic') {
            cb(null, true);
        } else {
            cb(new Error('Only .lic files are allowed'));
        }
    }
});

// Middleware to check if user is super admin
function requireSuperAdmin(req, res, next) {
    // Check if user exists and has super admin role
    if (!req.session.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Check if user is superuser with super role
    const user = req.session.user;
    if (user.username !== 'superuser' || user.role !== 'super') {
        return res.status(403).json({ error: 'Access denied: Super Admin privileges required' });
    }
    
    next();
}

// ========== SUPER ADMIN ROUTES (License Generation) ==========

/**
 * GET /license/generate - Show license generation page (Super Admin only)
 */
router.get('/generate', requireSuperAdmin, (req, res) => {
    try {
        const appName = appConfig.getLicenseAppName();
        const currentLicense = licenseManager.getLicenseInfo();
        
        res.render('admin/license-generator', {
            title: 'License Generator - Super Admin',
            user: req.session.user,
            appName: appName,
            currentLicense: currentLicense,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading license generator:', error);
        res.status(500).render('error', { 
            message: 'Failed to load license generator',
            error: error 
        });
    }
});

/**
 * POST /license/generate - Generate new license (Super Admin only)
 */
router.post('/generate', requireSuperAdmin, (req, res) => {
    try {
        const { companyName, validityType, validityValue } = req.body;
        
        // Validate input
        if (!companyName || !validityType || !validityValue) {
            return res.status(400).json({
                error: 'All fields are required',
                details: 'Company name, validity type, and validity value must be provided'
            });
        }
        
        // Calculate validity days
        let validityDays;
        switch (validityType) {
            case 'days':
                validityDays = parseInt(validityValue);
                break;
            case 'months':
                validityDays = parseInt(validityValue) * 30;
                break;
            case 'years':
                validityDays = parseInt(validityValue) * 365;
                break;
            default:
                return res.status(400).json({ error: 'Invalid validity type' });
        }
        
        // Allow negative values for testing expired licenses
        // Positive values: Max 10 years, Negative values: Min -365 days (1 year expired)
        if (validityDays > 3650 || validityDays < -365) {
            return res.status(400).json({ 
                error: 'Invalid validity period',
                details: 'Validity must be between -365 days (for testing) and 10 years'
            });
        }
        
        // Generate license
        const licenseData = licenseManager.generateLicense({
            companyName: companyName.trim(),
            validityDays: validityDays,
            licenseType: 'generated'
        });
        
        console.log(`📋 Super Admin generated license for: ${companyName} (${validityDays} days)`);
        
        res.json({
            success: true,
            message: 'License generated successfully',
            license: {
                licenseId: licenseData.licenseId,
                companyName: licenseData.companyName,
                validityDays: licenseData.validityDays,
                expiryDate: new Date(licenseData.expiryDate).toLocaleDateString()
            }
        });
        
    } catch (error) {
        console.error('Error generating license:', error);
        res.status(500).json({
            error: 'Failed to generate license',
            details: error.message
        });
    }
});

/**
 * POST /license/download - Download generated license file (Super Admin only)
 */
router.post('/download', requireSuperAdmin, (req, res) => {
    try {
        const { companyName, validityType, validityValue } = req.body;
        
        // Calculate validity days
        let validityDays;
        switch (validityType) {
            case 'days':
                validityDays = parseInt(validityValue);
                break;
            case 'months':
                validityDays = parseInt(validityValue) * 30;
                break;
            case 'years':
                validityDays = parseInt(validityValue) * 365;
                break;
            default:
                return res.status(400).json({ error: 'Invalid validity type' });
        }
        
        // Generate license
        const licenseData = licenseManager.generateLicense({
            companyName: companyName.trim(),
            validityDays: validityDays,
            licenseType: 'generated'
        });
        
        // Create JWT token for the license
        const jwt = require('jsonwebtoken');
        const LICENSE_SECRET = 'vikram-steels-license-secret-2025';
        
        // Handle JWT signing for negative validity days (expired licenses for testing)
        let jwtOptions = { algorithm: 'HS256' };
        
        if (validityDays > 0) {
            // Normal license - set expiration
            jwtOptions.expiresIn = `${validityDays}d`;
        } else {
            // Expired license for testing - don't set expiration, let the license data handle it
            console.log('⚠️ Creating expired license for testing - JWT will not have expiration');
        }
        
        const signedLicense = jwt.sign(licenseData, LICENSE_SECRET, jwtOptions);
        
        // Create filename
        const safeCompanyName = companyName.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${safeCompanyName}_License_${Date.now()}.lic`;
        
        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        
        console.log(`📥 License downloaded for: ${companyName}`);
        
        // Send the license file
        res.send(signedLicense);
        
    } catch (error) {
        console.error('Error downloading license:', error);
        res.status(500).json({
            error: 'Failed to download license',
            details: error.message
        });
    }
});

// ========== USER ROUTES (License Upload) ==========

/**
 * GET /license/upload - Show license upload page
 */
router.get('/upload', (req, res) => {
    try {
        const currentLicense = licenseManager.getLicenseInfo();
        const appName = appConfig.getLicenseAppName();
        
        res.render('settings/license-upload', {
            title: 'Upload License',
            user: req.session.user,
            currentLicense: currentLicense,
            appName: appName,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading license upload page:', error);
        res.status(500).render('error', { 
            message: 'Failed to load license upload page',
            error: error 
        });
    }
});

/**
 * POST /license/upload - Upload and replace current license
 */
router.post('/upload', upload.single('licenseFile'), (req, res) => {
    try {
        const licenseFile = req.file;
        
        // Check if request came from license expired page
        const isFromExpiredPage = req.get('Referer') && req.get('Referer').includes('/license-expired');
        
        // Validate input
        if (!licenseFile) {
            if (isFromExpiredPage) {
                return res.redirect('/license-expired?error=' + encodeURIComponent('License file is required'));
            }
            return res.status(400).json({
                error: 'License file is required'
            });
        }
        
        // Parse license file
        const jwt = require('jsonwebtoken');
        const fs = require('fs');
        const path = require('path');
        const LICENSE_SECRET = 'vikram-steels-license-secret-2025';
        
        let licenseData;
        try {
            licenseData = jwt.verify(licenseFile.buffer.toString(), LICENSE_SECRET);
        } catch (jwtError) {
            // If JWT verification fails due to expiration, try to decode without verification for testing
            if (jwtError.name === 'TokenExpiredError') {
                try {
                    licenseData = jwt.decode(licenseFile.buffer.toString());
                    if (!licenseData) {
                        throw new Error('Could not decode token');
                    }
                    console.log('⚠️ Expired license detected - allowing for testing purposes');
                } catch (decodeError) {
                    if (isFromExpiredPage) {
                        return res.redirect('/license-expired?error=' + encodeURIComponent('Invalid license file - file is corrupted or tampered with'));
                    }
                    return res.status(400).json({
                        error: 'Invalid license file',
                        details: 'License file is corrupted or tampered with'
                    });
                }
            } else {
                if (isFromExpiredPage) {
                    return res.redirect('/license-expired?error=' + encodeURIComponent('Invalid license file - file is corrupted or tampered with'));
                }
                return res.status(400).json({
                    error: 'Invalid license file',
                    details: 'License file is corrupted or tampered with'
                });
            }
        }
        
        // Validate company name matches expected app name
        const expectedAppName = appConfig.getLicenseAppName();
        if (licenseData.companyName !== expectedAppName) {
            const errorMsg = `License company name mismatch - License is for "${licenseData.companyName}", but this app requires "${expectedAppName}"`;
            if (isFromExpiredPage) {
                return res.redirect('/license-expired?error=' + encodeURIComponent(errorMsg));
            }
            return res.status(400).json({
                error: 'Company name mismatch',
                details: errorMsg
            });
        }
        
        // Check if license is already expired (allow for testing purposes)
        const now = new Date();
        const expiryDate = new Date(licenseData.expiryDate);
        const isExpired = now > expiryDate;
        
        if (isExpired) {
            console.log('⚠️ Uploading expired license for testing purposes');
        }
        
        // Simply overwrite the current license file using the proper license directory
        const licenseManager = require('../utils/licenseManager');
        const LICENSE_DIR = licenseManager.getLicenseDir();
        const LICENSE_FILE = path.join(LICENSE_DIR, 'current.lic');
        
        // Ensure license directory exists
        if (!fs.existsSync(LICENSE_DIR)) {
            fs.mkdirSync(LICENSE_DIR, { recursive: true });
        }
        
        // Write the new license file directly
        fs.writeFileSync(LICENSE_FILE, licenseFile.buffer.toString());
        
        // Update license state to reflect successful upload
        licenseManager.saveLicenseState('activated');
        
        // Clear the license expired flags in the app
        const app = req.app;
        app.locals.licenseExpired = false;
        app.locals.licenseBlocked = false;
        app.locals.licenseError = null;
        
        const daysRemaining = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
        
        console.log(`✅ License uploaded successfully for: ${licenseData.companyName}`);
        console.log(`   Valid until: ${expiryDate.toLocaleDateString()}`);
        console.log(`   Days remaining: ${daysRemaining} ${daysRemaining < 0 ? '(EXPIRED for testing)' : ''}`);
        console.log(`🔄 License flags cleared - application access restored`);
        
        // Handle response based on where request came from
        if (isFromExpiredPage) {
            if (isExpired) {
                // Still expired after upload - redirect back to expired page
                return res.redirect('/license-expired?error=' + encodeURIComponent('The uploaded license is expired. Please upload a valid license.'));
            } else {
                // Valid license uploaded - redirect to dashboard
                return res.redirect('/?success=' + encodeURIComponent('License uploaded and activated successfully! Welcome back to the system.'));
            }
        } else {
            // Valid license uploaded - redirect to dashboard instead of JSON
            if (isExpired) {
                return res.redirect('/license-expired?error=' + encodeURIComponent('The uploaded license is expired. Please upload a valid license.'));
            } else {
                return res.redirect('/?success=' + encodeURIComponent('License uploaded and activated successfully!'));
            }
        }
        
    } catch (error) {
        console.error('Error uploading license:', error);
        
        const isFromExpiredPage = req.get('Referer') && req.get('Referer').includes('/license-expired');
        const errorMessage = error.message.includes('already activated') ? 
            'License already in use - This license is already activated on a different machine' :
            `Failed to upload license - ${error.message}`;
        
        if (isFromExpiredPage) {
            return res.redirect('/license-expired?error=' + encodeURIComponent(errorMessage));
        }
        
        if (error.message.includes('already activated')) {
            return res.status(400).json({
                error: 'License already in use',
                details: 'This license is already activated on a different machine'
            });
        }
        
        res.status(500).json({
            error: 'Failed to upload license',
            details: error.message
        });
    }
});

// ========== LICENSE INFO ROUTES ==========

/**
 * GET /license/info - Get current license information (API)
 */
router.get('/info', (req, res) => {
    try {
        const licenseInfo = licenseManager.getLicenseInfo();
        res.json(licenseInfo);
    } catch (error) {
        console.error('Error getting license info:', error);
        res.status(500).json({
            error: 'Failed to get license information'
        });
    }
});

/**
 * GET /license/status - Get license validation status
 */
router.get('/status', (req, res) => {
    try {
        const validation = licenseManager.validateLicense();
        res.json(validation);
    } catch (error) {
        console.error('Error validating license:', error);
        res.status(500).json({
            error: 'Failed to validate license'
        });
    }
});

module.exports = router;
