const path = require('path');
const fs = require('fs');
const os = require('os');
const { getFolderPath, getCompanyName, getAppType } = require('./app-config');

/**
 * Path Manager - Handles all file paths based on app-config
 */
class PathManager {
    constructor() {
        this.basePath = this.resolveBasePath();
        this.ensureDirectories();
    }

    /**
     * Resolve the base path based on app config
     */
    resolveBasePath() {
        const configPath = getFolderPath();
        
        if (!configPath) {
            // Web mode - use project folder
            return process.cwd();
        }
        
        // Desktop mode - expand %APPDATA% path
        const expanded = configPath.replace('%APPDATA%', os.homedir() + '/AppData/Roaming');
        return path.resolve(expanded);
    }

    /**
     * Get data folder path
     */
    getDataPath() {
        return path.join(this.basePath, 'data');
    }

    /**
     * Get backup folder path
     */
    getBackupPath() {
        return path.join(this.basePath, 'backups');
    }

    /**
     * Get uploads folder path
     */
    getUploadsPath() {
        return path.join(this.basePath, 'uploads');
    }

    /**
     * Get temp folder path
     */
    getTempPath() {
        return path.join(this.basePath, 'temp');
    }

    /**
     * Ensure all required directories exist
     */
    ensureDirectories() {
        const dirs = [
            this.basePath,
            this.getDataPath(),
            this.getBackupPath(),
            this.getUploadsPath(),
            this.getTempPath()
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`📁 Created directory: ${dir}`);
            }
        });
    }

    /**
     * Get app info for logging
     */
    getAppInfo() {
        return {
            type: getAppType(),
            company: getCompanyName(),
            basePath: this.basePath,
            mode: getAppType() === 'web' ? '🌐 Web Mode' : '🖥️ Desktop Mode'
        };
    }
}

// Export singleton instance
module.exports = new PathManager();
