/**
 * Universal JSON File Protection System
 * Automatically encodes/decodes ALL JSON files in the application
 * Overrides fs.readFileSync and fs.writeFileSync globally
 */

const fs = require('fs');
const path = require('path');

// Store original fs methods
const originalReadFileSync = fs.readFileSync;
const originalWriteFileSync = fs.writeFileSync;

/**
 * Check if a file is a JSON file
 */
function isJsonFile(filePath) {
    return path.extname(filePath).toLowerCase() === '.json';
}

/**
 * Check if content is Base64 encoded
 */
function isBase64Encoded(content) {
    try {
        // Base64 content won't start with { or [
        const trimmed = content.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            return false;
        }
        
        // Try to decode - if it succeeds and results in valid JSON, it's Base64
        const decoded = Buffer.from(content, 'base64').toString('utf8');
        JSON.parse(decoded);
        return true;
    } catch {
        return false;
    }
}

/**
 * Encode JSON content to Base64
 */
function encodeJsonContent(content) {
    try {
        // Verify it's valid JSON first
        JSON.parse(content);
        const encoded = Buffer.from(content, 'utf8').toString('base64');
        console.log(`🔒 Encoding JSON file to Base64`);
        return encoded;
    } catch (error) {
        console.log(`⚠️  Not valid JSON, saving as-is`);
        return content;
    }
}

/**
 * Decode Base64 content to JSON
 */
function decodeJsonContent(content) {
    try {
        const decoded = Buffer.from(content, 'base64').toString('utf8');
        // Verify decoded content is valid JSON
        JSON.parse(decoded);
        console.log(`🔓 Decoding Base64 to JSON`);
        return decoded;
    } catch (error) {
        console.log(`⚠️  Not Base64 encoded, reading as-is`);
        return content;
    }
}

/**
 * Override fs.readFileSync to automatically decode JSON files
 */
fs.readFileSync = function(filePath, options) {
    const result = originalReadFileSync.call(this, filePath, options);
    
    // Only process JSON files when reading as string
    if (isJsonFile(filePath) && (typeof options === 'string' || (options && options.encoding))) {
        const content = result.toString();
        
        // If content is Base64 encoded, decode it
        if (isBase64Encoded(content)) {
            return decodeJsonContent(content);
        }
    }
    
    return result;
};

/**
 * Override fs.writeFileSync to automatically encode JSON files
 */
fs.writeFileSync = function(filePath, data, options) {
    let processedData = data;
    
    // Only process JSON files
    if (isJsonFile(filePath)) {
        const content = typeof data === 'string' ? data : data.toString();
        
        // If it's valid JSON content, encode it
        try {
            JSON.parse(content);
            processedData = encodeJsonContent(content);
        } catch {
            // Not JSON, write as-is
        }
    }
    
    return originalWriteFileSync.call(this, filePath, processedData, options);
};

console.log('🛡️  Universal JSON Protection System activated - All JSON files will be automatically encoded/decoded');

module.exports = {
    isJsonFile,
    isBase64Encoded,
    encodeJsonContent,
    decodeJsonContent,
    originalReadFileSync,
    originalWriteFileSync
};
