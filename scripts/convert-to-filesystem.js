#!/usr/bin/env node

/**
 * Script to convert all LowDB references to file system operations
 * This will systematically replace all LowDB usage with dataManager
 */

const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');
const serverFile = path.join(__dirname, '..', 'server.js');

// Conversion patterns
const conversions = [
    // Import statements
    {
        pattern: /const low = require\('lowdb'\);?\s*/g,
        replacement: ''
    },
    {
        pattern: /const FileSync = require\('lowdb\/adapters\/FileSync'\);?\s*/g,
        replacement: ''
    },
    {
        pattern: /const dataManager = require\('\.\.\/utils\/dataManager'\);?\s*/g,
        replacement: "const dataManager = require('../utils/dataManager');\n"
    },
    
    // Database adapter declarations
    {
        pattern: /const \w+Adapter = new FileSync\(.*?\);?\s*/g,
        replacement: ''
    },
    
    // Database initialization
    {
        pattern: /const \w+Db = low\(\w+Adapter\);?\s*/g,
        replacement: ''
    },
    
    // Default initialization
    {
        pattern: /\w+Db\.defaults\(.*?\)\.write\(\);?\s*/g,
        replacement: ''
    },
    
    // Common LowDB operations to dataManager equivalents
    {
        pattern: /(\w+)Db\.get\('(\w+)'\)\.value\(\)/g,
        replacement: "dataManager.getAll('$2')"
    },
    {
        pattern: /(\w+)Db\.get\('(\w+)'\)\.filter\(\s*\{\s*(\w+):\s*(\w+)\s*\}\s*\)\.value\(\)/g,
        replacement: "dataManager.findBy('$2', { $3: $4 })"
    },
    {
        pattern: /(\w+)Db\.get\('(\w+)'\)\.find\(\s*\{\s*(\w+):\s*([^}]+)\s*\}\s*\)\.value\(\)/g,
        replacement: "dataManager.findBy('$2', { $3: $4 })[0]"
    },
    {
        pattern: /(\w+)Db\.get\('(\w+)'\)\.push\(([^)]+)\)\.write\(\)/g,
        replacement: "dataManager.add('$2', $3)"
    },
    {
        pattern: /(\w+)Db\.read\(\)\.get\('(\w+)'\)\.value\(\)/g,
        replacement: "dataManager.getAll('$2')"
    }
];

function convertFile(filePath) {
    console.log(`Converting: ${filePath}`);
    
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Apply conversions
    conversions.forEach(({ pattern, replacement }) => {
        if (pattern.test(content)) {
            content = content.replace(pattern, replacement);
            modified = true;
        }
    });
    
    // Add dataManager import if needed and not already present
    if (modified && !content.includes("const dataManager = require('../utils/dataManager')")) {
        // Find the last require statement and add dataManager import after it
        const requirePattern = /(const .* = require\(.*?\);?\s*)/g;
        let lastRequireIndex = -1;
        let match;
        
        while ((match = requirePattern.exec(content)) !== null) {
            lastRequireIndex = match.index + match[0].length;
        }
        
        if (lastRequireIndex > -1) {
            content = content.slice(0, lastRequireIndex) + 
                     "const dataManager = require('../utils/dataManager');\n" + 
                     content.slice(lastRequireIndex);
        }
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Converted: ${filePath}`);
    } else {
        console.log(`⏭️  No changes needed: ${filePath}`);
    }
}

// Convert all route files
const routeFiles = fs.readdirSync(routesDir)
    .filter(file => file.endsWith('.js'))
    .map(file => path.join(routesDir, file));

console.log('🔄 Starting LowDB to File System conversion...\n');

routeFiles.forEach(convertFile);

// Convert server.js
convertFile(serverFile);

console.log('\n✅ Conversion completed!');
console.log('\n🔧 Manual fixes still needed:');
console.log('   - Complex LowDB queries may need manual conversion');
console.log('   - Check for any remaining .write(), .value(), .update() calls');
console.log('   - Test all functionality thoroughly');
