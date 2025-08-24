/**
 * Application Configuration Control
 * Change the settings below to switch between web and desktop mode
 */

// ========== CONFIGURATION SETTINGS ==========
const COMPANY_NAME = "Ram Steels"; // Used for folder naming and display
const LICENSE_APP_NAME = "Ram Steels Management System"; // Used for license validation
const APP_TYPE = "desktop"; // Change to "desktop" for desktop mode
const LICENSE_SECRET = "25c940c9046913b04d1ed2f580d29eed3478881b9e36e722f88ee1a62595f3ca";
const UNLIMITED_LICENSE = false; // Set to true to auto-generate 10-year license on startup
const USE_OLD_WELCOME_SCREEN = false; // Set to true to use welcome-old.ejs instead of welcome.ejs
const companyNameNoSpaces = COMPANY_NAME.replace(/\s+/g, '');
const NEED_SUPER_USER = false;

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
 * Get the license secret for JWT signing/verification
 * @returns {string} The license secret key
 */
function getLicenseSecret() {
    return LICENSE_SECRET;
}

/**
 * Check if unlimited license is enabled
 * @returns {boolean} True if unlimited license should be auto-generated
 */
function isUnlimitedLicenseEnabled() {
    return UNLIMITED_LICENSE;
}

/**
 * Check if old welcome screen should be used
 * @returns {boolean} True if welcome-old.ejs should be used instead of welcome.ejs
 */
function useOldWelcomeScreen() {
    return USE_OLD_WELCOME_SCREEN;
}

/**
 * Check if super user is needed
 * @returns {boolean} True if super user should be created
 */
function needSuperUser() {
    return NEED_SUPER_USER;
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
    getLicenseAppName,
    getLicenseSecret,
    isUnlimitedLicenseEnabled,
    useOldWelcomeScreen,
    needSuperUser
};
