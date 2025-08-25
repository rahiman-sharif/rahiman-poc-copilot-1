/**
 * Application Configuration Control
 * Change the settings below to switch between web and desktop mode
 */

// ========== CONFIGURATION SETTINGS ==========

const Types = {
  vikramdesktop: "vikramdesktop",
  vikramweb: "vikramweb",
  kanakkardesktop: "kanakkardesktop",
  kanakkarweb: "kanakkarweb",
};
const LICENSE_SECRET = "25c940c9046913b04d1ed2f580d29eed3478881b9e36e722f88ee1a62595f3ca";
    let data_COMPANY_NAME;
    let data_LICENSE_APP_NAME;
    let data_APP_TYPE;
    let data_UNLIMITED_LICENSE;
    let data_USE_OLD_WELCOME_SCREEN;
    let data_NEED_SUPER_USER;
    let data_LIMITEDACCESS;

let TypeBuild = Types.kanakkarweb;

console.log('🔧 Configuration Debug:', {
    TypeBuild: TypeBuild,
    Expected: Types.vikramdesktop,
    Match: TypeBuild === Types.vikramdesktop
});

if(TypeBuild === Types.vikramdesktop){
    data_COMPANY_NAME = 'Vikram Steels'
    data_LICENSE_APP_NAME = `${data_COMPANY_NAME} Management System`;
    data_APP_TYPE = 'desktop';
    data_UNLIMITED_LICENSE = false; 
    data_USE_OLD_WELCOME_SCREEN = true;     
    data_NEED_SUPER_USER = false;
    data_LIMITEDACCESS = true;
    console.log('✅ Using Vikram Steels Desktop configuration');
}
else if(TypeBuild === Types.vikramweb){
    data_COMPANY_NAME = 'Vikram Steels'
    data_LICENSE_APP_NAME = `${data_COMPANY_NAME} Management System`;
    data_APP_TYPE = 'web';
    data_UNLIMITED_LICENSE = true; 
    data_USE_OLD_WELCOME_SCREEN = true;     
    data_NEED_SUPER_USER = true;
    data_LIMITEDACCESS = true;
    console.log('✅ Using Vikram Steels Web configuration');
}
else if(TypeBuild === Types.kanakkardesktop){
    data_COMPANY_NAME = "Test Industries"
    data_LICENSE_APP_NAME = `${data_COMPANY_NAME} Management System`;
    data_APP_TYPE = 'desktop';
    data_UNLIMITED_LICENSE = false; 
    data_USE_OLD_WELCOME_SCREEN = false;     
    data_NEED_SUPER_USER = false;
    data_LIMITEDACCESS = false;
    console.log('❌ Using Test Industries Desktop configuration - THIS SHOULD NOT HAPPEN!');
}
else if(TypeBuild === Types.kanakkarweb){
    data_COMPANY_NAME = "Test Industries"
    data_LICENSE_APP_NAME = `${data_COMPANY_NAME} Management System`;
    data_APP_TYPE = 'web';
    data_UNLIMITED_LICENSE = true; 
    data_USE_OLD_WELCOME_SCREEN = false;     
    data_NEED_SUPER_USER = true;
    data_LIMITEDACCESS = false;
    console.log('❌ Using Test Industries Web configuration - THIS SHOULD NOT HAPPEN!');
}

// Fallback values (should not be needed if TypeBuild is set correctly)
if (!data_COMPANY_NAME) {
    data_COMPANY_NAME = 'Vikram Steels'
    data_LICENSE_APP_NAME = `${data_COMPANY_NAME} Management System`;
    data_APP_TYPE = 'desktop';
    data_UNLIMITED_LICENSE = false; 
    data_USE_OLD_WELCOME_SCREEN = true;     
    data_NEED_SUPER_USER = false;
    data_LIMITEDACCESS = true;
}


const LIMITEDACCESS = data_LIMITEDACCESS;
const COMPANY_NAME = data_COMPANY_NAME;
const LICENSE_APP_NAME = data_LICENSE_APP_NAME;
const APP_TYPE= data_APP_TYPE;
const UNLIMITED_LICENSE = data_UNLIMITED_LICENSE;
const USE_OLD_WELCOME_SCREEN = data_USE_OLD_WELCOME_SCREEN;
const NEED_SUPER_USER = data_NEED_SUPER_USER;
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

function limitedAccess() {
    return LIMITEDACCESS;
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
    needSuperUser,
    limitedAccess
};
