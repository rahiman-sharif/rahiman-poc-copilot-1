const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const pathManager = require('../utils/path-manager');
const { loadRoutePermissions } = require('../middleware/routePermissions');

console.log('⚙️ Settings Router loaded');

// Middleware to require authentication
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', { 
            message: 'Access denied. Admin privileges required.',
            user: req.session.user 
        });
    }
};

// Admin or Super user middleware - both can access general settings
const requireAdminOrSuper = (req, res, next) => {
    if (req.session.user && (req.session.user.role === 'admin' || req.session.user.role === 'super')) {
        next();
    } else {
        res.status(403).render('error', { 
            message: 'Access denied. Admin privileges required.',
            user: req.session.user 
        });
    }
};

// Super user only middleware for sensitive operations
const requireSuperUser = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'super') {
        next();
    } else {
        res.status(403).render('error', { 
            message: 'Access denied. This section is not available.',
            user: req.session.user 
        });
    }
};

// GET /settings/company - Company setup page (Super user only)
router.get('/company', requireAuth, requireSuperUser, (req, res) => {
    try {
        const company = dataManager.getAll('company');
        
        res.render('settings/company', {
            title: `Company Setup - ${res.locals.companyName}`,
            user: req.session.user,
            company: company,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading company setup:', error);
        res.status(500).render('error', { 
            message: 'Error loading company setup',
            user: req.session.user 
        });
    }
});

// POST /settings/company - Update company details (Super user only)
router.post('/company', requireAuth, requireSuperUser, (req, res) => {
    try {
        const {
            companyName, addressLine1, addressLine2, city, state, pincode, country,
            phone1, phone2, email, website, gstin, panNo, registrationDate,
            invoicePrefix, accountHolderName, bankName, accountNumber, branchDetails
        } = req.body;

        // Get current company data
        const currentCompany = dataManager.getAll('company');
        
        // Update company data
        const updatedCompany = {
            ...currentCompany,
            name: companyName.trim(),
            address: {
                line1: addressLine1.trim(),
                line2: addressLine2 ? addressLine2.trim() : '',
                city: city.trim(),
                state: state.trim(),
                pincode: pincode.trim(),
                country: country.trim()
            },
            contact: {
                phone1: phone1.trim(),
                phone2: phone2 ? phone2.trim() : '',
                email: email.trim(),
                website: website ? website.trim() : ''
            },
            gst: {
                gstin: gstin.trim(),
                panNo: panNo.trim(),
                registrationDate: registrationDate
            },
            bankDetails: {
                accountHolderName: accountHolderName ? accountHolderName.trim() : '',
                bankName: bankName ? bankName.trim() : '',
                accountNumber: accountNumber ? accountNumber.trim() : '',
                branchDetails: branchDetails ? branchDetails.trim() : ''
            },
            invoice: {
                prefix: invoicePrefix.trim(),
                nextNumber: currentCompany.invoice ? currentCompany.invoice.nextNumber : 1
            },
            updatedAt: new Date().toISOString()
        };

        // Update using dataManager.writeData since company has a different structure
        try {
            dataManager.writeData('company', { company: updatedCompany });
            console.log('✅ Company details updated successfully');
            res.redirect('/settings/company?success=' + encodeURIComponent('Company details updated successfully'));
        } catch (writeError) {
            console.error('Error writing company data:', writeError);
            console.log('❌ Failed to update company details');
            res.redirect('/settings/company?error=' + encodeURIComponent('Failed to update company details'));
        }
    } catch (error) {
        console.error('Error updating company:', error);
        res.redirect('/settings/company?error=' + encodeURIComponent('Error updating company details'));
    }
});

// GET /settings/company/download - Download company data in encrypted format (Admin+ only)
router.get('/company/download', requireAuth, requireAdminOrSuper, (req, res) => {
    try {
        const fs = require('fs');
        const path = require('path');
        
        // Get the absolute path to the company.json file
        const companyFilePath = path.join(process.cwd(), 'data', 'company.json');
        
        if (!fs.existsSync(companyFilePath)) {
            return res.status(404).send('Company data file not found');
        }
        
        // Read the file as raw buffer/binary to avoid any JSON parsing
        const fileBuffer = fs.readFileSync(companyFilePath);
        
        // Create a filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const filename = `company-encrypted-${timestamp}.json`;
        
        // Set headers for direct file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Length', fileBuffer.length);
        
        console.log(`📄 Raw encrypted file downloaded by: ${req.session.user.username}`);
        console.log(`📄 File size: ${fileBuffer.length} bytes`);
        
        // Send the raw file buffer directly
        res.send(fileBuffer);
        
    } catch (error) {
        console.error('Error downloading company data:', error);
        res.status(500).send('Failed to download company data');
    }
});

// GET /settings/company-upload - Company data upload page (Admin+ only)
router.get('/company-upload', requireAuth, requireAdminOrSuper, (req, res) => {
    try {
        res.render('settings/company-upload', {
            title: `Upload Company Data - ${res.locals.companyName}`,
            user: req.session.user,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading company upload page:', error);
        res.status(500).render('error', { 
            message: 'Error loading company upload page',
            user: req.session.user 
        });
    }
});

// POST /settings/company-upload - Handle company data upload (Admin+ only)
router.post('/company-upload', requireAuth, requireAdminOrSuper, (req, res) => {
    const multer = require('multer');
    const fs = require('fs');
    const path = require('path');
    
    // Configure multer for file upload
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB limit
        },
        fileFilter: (req, file, cb) => {
            if (file.mimetype === 'application/json' || file.originalname.endsWith('.json')) {
                cb(null, true);
            } else {
                cb(new Error('Only JSON files are allowed'));
            }
        }
    }).single('companyFile');

    upload(req, res, (err) => {
        if (err) {
            console.error('Upload error:', err);
            return res.redirect('/settings/company-upload?error=' + encodeURIComponent('Upload failed: ' + err.message));
        }

        if (!req.file) {
            return res.redirect('/settings/company-upload?error=' + encodeURIComponent('No file selected'));
        }

        try {
            // Get the uploaded file content
            const uploadedContent = req.file.buffer.toString('utf8');
            
            // Create backup of current file
            const companyFilePath = path.join(process.cwd(), 'data', 'company.json');
            const backupPath = path.join(process.cwd(), 'backups', `company-backup-${Date.now()}.json`);
            
            // Ensure backups directory exists
            const backupsDir = path.dirname(backupPath);
            if (!fs.existsSync(backupsDir)) {
                fs.mkdirSync(backupsDir, { recursive: true });
            }
            
            // Create backup
            if (fs.existsSync(companyFilePath)) {
                fs.copyFileSync(companyFilePath, backupPath);
                console.log(`📄 Backup created: ${backupPath}`);
            }
            
            // Write the new content
            fs.writeFileSync(companyFilePath, uploadedContent, 'utf8');
            
            // Try to decode and read the uploaded company data for verification
            try {
                const decodedData = dataManager.getAll('company');
                const companyName = decodedData?.name || 'Unknown';
                const gstIn = decodedData?.gst?.gstin || 'N/A';
                const phone = decodedData?.contact?.phone1 || 'N/A';
                const city = decodedData?.address?.city || 'N/A';
                
                console.log(`📄 Company data updated by: ${req.session.user.username}`);
                console.log(`📄 File size: ${uploadedContent.length} bytes`);
                console.log(`📄 Company Name: ${companyName}`);
                console.log(`📄 GST: ${gstIn}`);
                
                const successMessage = `Company data updated successfully!`;
                
                res.redirect('/settings/company-upload?success=' + encodeURIComponent(successMessage));
                
            } catch (decodeError) {
                console.error('Error decoding uploaded data:', decodeError);
                res.redirect('/settings/company-upload?success=' + encodeURIComponent('Company data updated successfully (encrypted format)'));
            }
            
        } catch (error) {
            console.error('Error processing uploaded file:', error);
            res.redirect('/settings/company-upload?error=' + encodeURIComponent('Failed to process uploaded file'));
        }
    });
});

// Test route to ensure router works
router.get('/', requireAuth, requireAdminOrSuper, async (req, res) => {
    try {
        console.log('📋 Settings route accessed!');
        
        // Get company data for the settings page
        const company = await dataManager.getAll('company');
        
        // Get system stats
        const users = await dataManager.getAll('users');
        const items = await dataManager.getAll('items');
        const bills = await dataManager.getAll('bills');
        const customers = await dataManager.getAll('customers');
        
        const systemStats = {
            totalUsers: users ? users.length : 0,
            totalItems: items ? items.length : 0,
            totalBills: bills ? bills.length : 0,
            totalCustomers: customers ? customers.length : 0
        };
        
        res.render('settings/index', {
            title: `Settings Dashboard - ${res.locals.companyName}`,
            user: req.session.user,
            company: company,
            systemStats: systemStats,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading settings:', error);
        res.status(500).render('error', {
            message: 'Failed to load settings',
            user: req.session.user
        });
    }
});

// Route Control (Super User Only)
router.get('/route-control', requireSuperUser, (req, res) => {
    try {
        const permissions = loadRoutePermissions();
        res.render('settings/route-control', {
            title: `Route Control - ${res.locals.companyName}`,
            user: req.session.user,
            company: res.locals.company,
            permissions: permissions,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading route permissions:', error);
        res.status(500).render('error', {
            message: 'Failed to load route control settings',
            user: req.session.user
        });
    }
});

router.post('/route-control', requireSuperUser, (req, res) => {
    try {
        console.log('📊 Route Control Save Request:');
        console.log('Request body:', JSON.stringify(req.body, null, 2));
        
        const { permissions } = req.body;
        
        if (!permissions) {
            console.log('❌ No permissions data received');
            return res.status(400).json({ success: false, message: 'No permissions data received' });
        }
        
        // Load existing permissions structure
        const existingPermissions = loadRoutePermissions();
        console.log('📂 Existing permissions loaded');
        
        // Update enabled status for each route
        for (const groupKey in permissions) {
            for (const routePath in permissions[groupKey]) {
                if (existingPermissions.permissions[groupKey] && 
                    existingPermissions.permissions[groupKey][routePath]) {
                    existingPermissions.permissions[groupKey][routePath].enabled = 
                        permissions[groupKey][routePath].enabled;
                    console.log(`✅ Updated ${groupKey}${routePath}: ${permissions[groupKey][routePath].enabled}`);
                }
            }
        }
        
        // Save updated permissions
        const fs = require('fs');
        const path = require('path');
        const permissionsPath = path.join(pathManager.getDataPath(), 'route-permissions.json');
        fs.writeFileSync(permissionsPath, JSON.stringify(existingPermissions, null, 2));
        console.log('💾 Permissions saved to file');
        
        res.json({ success: true, message: 'Route permissions updated successfully' });
    } catch (error) {
        console.error('❌ Error saving route permissions:', error);
        res.status(500).json({ success: false, message: 'Failed to save permissions' });
    }
});

module.exports = router;
