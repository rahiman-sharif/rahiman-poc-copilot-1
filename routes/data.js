const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const pathManager = require('../utils/path-manager');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const multer = require('multer');
const extractZip = require('extract-zip');

//console.log('💾 Data Management router loaded');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadsDir = pathManager.getUploadsPath();
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        cb(null, `backup-upload-${timestamp}.zip`);
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/zip' || 
            file.mimetype === 'application/x-zip-compressed' ||
            file.originalname.toLowerCase().endsWith('.zip')) {
            cb(null, true);
        } else {
            cb(new Error('Only ZIP files are allowed'), false);
        }
    },
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    }
});

//console.log('💾 Data Management router loaded');

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

// Admin or Super user middleware - both can access data management
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

// GET /data - Data management dashboard
router.get('/', requireAdminOrSuper, async (req, res) => {
    try {
        // Get file stats
        const dataDir = pathManager.getDataPath();
        const files = fs.readdirSync(dataDir);
        
        const fileStats = [];
        for (const file of files) {
            const filePath = path.join(dataDir, file);
            const stats = fs.statSync(filePath);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            let recordCount = 0;
            if (typeof data === 'object' && data !== null) {
                const keys = Object.keys(data);
                if (keys.length > 0) {
                    const firstKey = keys[0];
                    if (Array.isArray(data[firstKey])) {
                        recordCount = data[firstKey].length;
                    }
                }
            }
            
            fileStats.push({
                name: file,
                size: (stats.size / 1024).toFixed(2) + ' KB',
                modified: stats.mtime.toLocaleString(),
                records: recordCount
            });
        }
        
        res.render('data/index', {
            title: 'Data Management',
            user: req.session.user,
            fileStats: fileStats,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading data management:', error);
        res.status(500).render('error', {
            message: 'Failed to load data management',
            user: req.session.user
        });
    }
});

// GET /data/backup - Create backup
router.get('/backup', requireAdminOrSuper, async (req, res) => {
    try {
        const dataDir = pathManager.getDataPath();
        const backupDir = pathManager.getBackupPath();
        
        // Create backups directory if it doesn't exist
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir);
        }
        
        // Create timestamp for backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup-${timestamp}`;
        const backupPath = path.join(backupDir, backupName);
        
        // Create backup directory
        fs.mkdirSync(backupPath);
        
        // Copy all data files
        const files = fs.readdirSync(dataDir);
        for (const file of files) {
            const sourcePath = path.join(dataDir, file);
            const destPath = path.join(backupPath, file);
            fs.copyFileSync(sourcePath, destPath);
        }
        
        // Create backup info file
        const backupInfo = {
            created: new Date().toISOString(),
            createdBy: req.session.user.username,
            files: files,
            version: '1.0.0'
        };
        
        fs.writeFileSync(
            path.join(backupPath, 'backup-info.json'), 
            JSON.stringify(backupInfo, null, 2)
        );
        
        res.redirect(`/data?success=Backup created successfully: ${backupName}`);
        
    } catch (error) {
        console.error('Error creating backup:', error);
        res.redirect('/data?error=Failed to create backup');
    }
});

// GET /data/backups - List backups
router.get('/backups', requireAdminOrSuper, (req, res) => {
    try {
        const backupDir = pathManager.getBackupPath();
        
        let backups = [];
        if (fs.existsSync(backupDir)) {
            const backupItems = fs.readdirSync(backupDir);
            
            backups = backupItems.map(item => {
                const itemPath = path.join(backupDir, item);
                const stats = fs.statSync(itemPath);
                
                // Handle directories (full backups)
                if (stats.isDirectory()) {
                    let backupInfo = {};
                    const infoPath = path.join(itemPath, 'backup-info.json');
                    if (fs.existsSync(infoPath)) {
                        backupInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                    }
                    
                    return {
                        name: item,
                        type: 'full',
                        created: backupInfo.created || stats.ctime.toISOString(),
                        createdBy: backupInfo.createdBy || 'Unknown',
                        size: getFolderSize(itemPath),
                        files: backupInfo.files ? backupInfo.files.length : 0
                    };
                } 
                // Handle individual JSON files (company backups, etc.)
                else if (stats.isFile() && item.endsWith('.json')) {
                    return {
                        name: item,
                        type: 'file',
                        created: stats.ctime.toISOString(),
                        createdBy: 'System',
                        size: (stats.size / 1024).toFixed(2) + ' KB',
                        files: 1
                    };
                }
                return null; // Skip other file types
            }).filter(backup => backup !== null) // Remove null entries
              .sort((a, b) => new Date(b.created) - new Date(a.created));
        }
        
        res.render('data/backups', {
            title: 'Backup Management',
            user: req.session.user,
            backups: backups,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading backups:', error);
        res.status(500).render('error', {
            message: 'Failed to load backups',
            user: req.session.user
        });
    }
});

// POST /data/restore/:backupName - Restore from backup
router.post('/restore/:backupName', requireAdminOrSuper, async (req, res) => {
    try {
        const backupName = req.params.backupName;
        const backupDir = pathManager.getBackupPath();
        const backupPath = path.join(backupDir, backupName);
        const dataDir = pathManager.getDataPath();
        
        if (!fs.existsSync(backupPath)) {
            return res.redirect('/data/backups?error=Backup not found');
        }
        
        // Create current data backup before restore
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const preRestoreBackup = path.join(backupDir, `pre-restore-${timestamp}`);
        fs.mkdirSync(preRestoreBackup);
        
        const currentFiles = fs.readdirSync(dataDir);
        for (const file of currentFiles) {
            const sourcePath = path.join(dataDir, file);
            const destPath = path.join(preRestoreBackup, file);
            fs.copyFileSync(sourcePath, destPath);
        }
        
        // Restore from backup
        const backupFiles = fs.readdirSync(backupPath);
        for (const file of backupFiles) {
            if (file !== 'backup-info.json') {
                const sourcePath = path.join(backupPath, file);
                const destPath = path.join(dataDir, file);
                fs.copyFileSync(sourcePath, destPath);
            }
        }
        
        res.redirect('/data?success=Data restored successfully from backup');
        
    } catch (error) {
        console.error('Error restoring backup:', error);
        res.redirect('/data/backups?error=Failed to restore backup');
    }
});

// GET /data/export - Export data
router.get('/export', requireAdminOrSuper, async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const dataDir = pathManager.getDataPath();
        
        if (format === 'json') {
            // Export as single JSON file
            const allData = {};
            const files = fs.readdirSync(dataDir);
            
            for (const file of files) {
                const filePath = path.join(dataDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const tableName = path.basename(file, '.json');
                allData[tableName] = data;
            }
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `vikram-steels-export-${timestamp}.json`;
            
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.send(JSON.stringify(allData, null, 2));
            
        } else if (format === 'csv') {
            // Export as CSV files in ZIP
            const archiver = require('archiver');
            const archive = archiver('zip');
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `vikram-steels-export-${timestamp}.zip`;
            
            res.setHeader('Content-Type', 'application/zip');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            
            archive.pipe(res);
            
            const files = fs.readdirSync(dataDir);
            for (const file of files) {
                const filePath = path.join(dataDir, file);
                const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                const tableName = path.basename(file, '.json');
                
                // Convert to CSV
                const csv = jsonToCSV(data[tableName] || []);
                archive.append(csv, { name: `${tableName}.csv` });
            }
            
            archive.finalize();
        }
        
    } catch (error) {
        console.error('Error exporting data:', error);
        res.redirect('/data?error=Failed to export data');
    }
});

// Helper function to get folder size
function getFolderSize(folderPath) {
    try {
        const stats = fs.statSync(folderPath);
        
        // If it's a file, just return its size
        if (stats.isFile()) {
            return (stats.size / 1024).toFixed(2) + ' KB';
        }
        
        // If it's a directory, calculate total size
        if (stats.isDirectory()) {
            let size = 0;
            const files = fs.readdirSync(folderPath);
            
            for (const file of files) {
                const filePath = path.join(folderPath, file);
                const fileStats = fs.statSync(filePath);
                
                if (fileStats.isFile()) {
                    size += fileStats.size;
                } else if (fileStats.isDirectory()) {
                    // Recursively calculate size for subdirectories
                    const subDirSize = getFolderSize(filePath);
                    size += parseFloat(subDirSize.replace(' KB', '')) * 1024;
                }
            }
            
            return (size / 1024).toFixed(2) + ' KB';
        }
        
        return '0 KB';
    } catch (error) {
        console.error('Error calculating folder size:', error);
        return '0 KB';
    }
}

// Helper function to convert JSON to CSV
function jsonToCSV(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return '';
    }
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => {
        return headers.map(header => {
            const value = row[header];
            if (value === null || value === undefined) {
                return '';
            }
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
}

// GET /data/download/:backupName - Download backup as ZIP
router.get('/download/:backupName', requireAdminOrSuper, async (req, res) => {
    try {
        const backupName = req.params.backupName;
        const backupDir = pathManager.getBackupPath();
        const backupPath = path.join(backupDir, backupName);
        
        if (!fs.existsSync(backupPath)) {
            return res.status(404).json({ error: 'Backup not found' });
        }
        
        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Best compression
        });
        
        const zipFilename = `${backupName}.zip`;
        
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFilename}"`);
        
        archive.pipe(res);
        
        // Add all files from backup folder to ZIP
        archive.directory(backupPath, false);
        
        archive.finalize();
        
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ error: 'Failed to download backup' });
    }
});

// POST /data/upload-restore - Upload and restore backup from ZIP
router.post('/upload-restore', requireAdminOrSuper, upload.single('backupFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.redirect('/data?error=No file uploaded');
        }

        const uploadedFile = req.file.path;
        const extractDir = path.join(pathManager.getTempPath(), 'restore-' + Date.now());
        
        // Clean up any existing temp directory
        if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true });
        }
        fs.mkdirSync(extractDir, { recursive: true });

        try {
            // Extract the ZIP file
            await extractZip(uploadedFile, { dir: extractDir });
            
            // Validate the backup structure
            const requiredFiles = ['bills.json', 'customers.json', 'items.json', 'users.json', 'settings.json'];
            const extractedFiles = fs.readdirSync(extractDir);
            
            // Check if it's a valid backup
            const hasRequiredFiles = requiredFiles.some(file => extractedFiles.includes(file));
            if (!hasRequiredFiles) {
                throw new Error('Invalid backup file - missing required data files');
            }
            
            // Create backup of current data before restore
            const backupTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const preRestoreBackupName = `pre-restore-${backupTimestamp}`;
            const backupDir = pathManager.getBackupPath();
            const preRestoreBackupPath = path.join(backupDir, preRestoreBackupName);
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            fs.mkdirSync(preRestoreBackupPath, { recursive: true });
            
            // Backup current data
            const dataDir = pathManager.getDataPath();
            const currentFiles = fs.readdirSync(dataDir);
            
            for (const file of currentFiles) {
                fs.copyFileSync(
                    path.join(dataDir, file), 
                    path.join(preRestoreBackupPath, file)
                );
            }
            
            // Create backup info
            const backupInfo = {
                created: new Date().toISOString(),
                createdBy: req.session.user.username,
                files: currentFiles,
                version: '1.0.0',
                type: 'pre-restore-backup'
            };
            
            fs.writeFileSync(
                path.join(preRestoreBackupPath, 'backup-info.json'), 
                JSON.stringify(backupInfo, null, 2)
            );
            
            // Restore data from uploaded backup
            for (const file of extractedFiles) {
                if (file.endsWith('.json') && file !== 'backup-info.json') {
                    const srcPath = path.join(extractDir, file);
                    const destPath = path.join(dataDir, file);
                    
                    // Validate JSON structure before copying
                    try {
                        const data = JSON.parse(fs.readFileSync(srcPath, 'utf8'));
                        fs.writeFileSync(destPath, JSON.stringify(data, null, 2));
                    } catch (jsonError) {
                        console.error(`Invalid JSON in ${file}:`, jsonError);
                        // Skip invalid files but continue with others
                    }
                }
            }
            
            // Clean up
            fs.rmSync(extractDir, { recursive: true });
            fs.unlinkSync(uploadedFile);
            
            res.redirect('/data?success=Backup restored successfully! Previous data backed up as: ' + preRestoreBackupName);
            
        } catch (extractError) {
            console.error('Error extracting or restoring backup:', extractError);
            
            // Clean up on error
            if (fs.existsSync(extractDir)) {
                fs.rmSync(extractDir, { recursive: true });
            }
            if (fs.existsSync(uploadedFile)) {
                fs.unlinkSync(uploadedFile);
            }
            
            res.redirect('/data?error=Failed to restore backup: ' + extractError.message);
        }
        
    } catch (error) {
        console.error('Error in upload-restore:', error);
        res.redirect('/data?error=Failed to process uploaded file: ' + error.message);
    }
});

module.exports = router;
