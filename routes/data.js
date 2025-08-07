const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const fs = require('fs');
const path = require('path');

console.log('💾 Data Management router loaded');

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

// GET /data - Data management dashboard
router.get('/', requireAdmin, async (req, res) => {
    try {
        // Get file stats
        const dataDir = path.join(__dirname, '..', 'data');
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
router.get('/backup', requireAdmin, async (req, res) => {
    try {
        const dataDir = path.join(__dirname, '..', 'data');
        const backupDir = path.join(__dirname, '..', 'backups');
        
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
router.get('/backups', requireAdmin, (req, res) => {
    try {
        const backupDir = path.join(__dirname, '..', 'backups');
        
        let backups = [];
        if (fs.existsSync(backupDir)) {
            const backupFolders = fs.readdirSync(backupDir);
            
            backups = backupFolders.map(folder => {
                const folderPath = path.join(backupDir, folder);
                const stats = fs.statSync(folderPath);
                
                let backupInfo = {};
                const infoPath = path.join(folderPath, 'backup-info.json');
                if (fs.existsSync(infoPath)) {
                    backupInfo = JSON.parse(fs.readFileSync(infoPath, 'utf8'));
                }
                
                return {
                    name: folder,
                    created: backupInfo.created || stats.ctime.toISOString(),
                    createdBy: backupInfo.createdBy || 'Unknown',
                    size: getFolderSize(folderPath),
                    files: backupInfo.files ? backupInfo.files.length : 0
                };
            }).sort((a, b) => new Date(b.created) - new Date(a.created));
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
router.post('/restore/:backupName', requireAdmin, async (req, res) => {
    try {
        const backupName = req.params.backupName;
        const backupDir = path.join(__dirname, '..', 'backups');
        const backupPath = path.join(backupDir, backupName);
        const dataDir = path.join(__dirname, '..', 'data');
        
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
router.get('/export', requireAdmin, async (req, res) => {
    try {
        const format = req.query.format || 'json';
        const dataDir = path.join(__dirname, '..', 'data');
        
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
    let size = 0;
    const files = fs.readdirSync(folderPath);
    
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        size += stats.size;
    }
    
    return (size / 1024).toFixed(2) + ' KB';
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

module.exports = router;
