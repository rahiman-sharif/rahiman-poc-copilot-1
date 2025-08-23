/**
 * Application Configuration Control
 * Change the settings below to switch between web and desktop mode
 */

// ========== CONFIGURATION SETTINGS ==========
const COMPANY_NAME = "Vikram Steels";
const LICENSE_APP_NAME = "Vikram Steels Management System"; // Used for license validation
const APP_TYPE = "desktop"; // Change to "desktop" for desktop mode
const companyNameNoSpaces = COMPANY_NAME.replace(/\s+/g, '');

// ========== FUNCTIONS ==========

/**
 * Get the storage folder path based on app type
 * @returns {string} Empty string for web (project folder) or AppData path for desktop
 */
function getFolderPath() {
    if (APP_TYPE === "desktop") {
        return `%APPDATA%/${companyNameNoSpaces}`;
    }
    return ""; // Empty string means current project folder
}

/**
 * Get the company name
 * @returns {string} The company name
 */
function getCompanyName() {
    return COMPANY_NAME;
}

/**
 * Get the company name
 * @returns {string} The company name
 */
function getCompanyNameFolder() {
    return companyNameNoSpaces;
}


/**
 * Get the license app name for validation
 * @returns {string} The app name used in licenses
 */
function getLicenseAppName() {
    return LICENSE_APP_NAME;
}

/**
 * Get the app type
 * @returns {string} "web" or "desktop"
 */
function getAppType() {
    return APP_TYPE;
}

module.exports = {
    getFolderPath,
    getCompanyName,
    getAppType,
    getCompanyNameFolder,
    getLicenseAppName
};
