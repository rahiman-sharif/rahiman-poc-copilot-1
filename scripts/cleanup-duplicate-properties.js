const fs = require('fs');
const path = require('path');

function cleanupDataFile(filePath) {
    try {
        console.log(`🧹 Cleaning up ${filePath}...`);
        
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        if (data.items) {
            let cleaned = 0;
            data.items.forEach(item => {
                // Remove flat stock properties if nested stock object exists
                if (item.stock && typeof item.stock === 'object') {
                    if (item.hasOwnProperty('stock.quantity')) {
                        delete item['stock.quantity'];
                        cleaned++;
                    }
                    if (item.hasOwnProperty('stock.minLevel')) {
                        delete item['stock.minLevel'];
                        cleaned++;
                    }
                }
                
                // Clean up any other flat nested properties
                const flatKeys = Object.keys(item).filter(key => key.includes('.'));
                flatKeys.forEach(key => {
                    delete item[key];
                    cleaned++;
                });
            });
            
            if (cleaned > 0) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
                console.log(`✅ Cleaned ${cleaned} duplicate properties from ${path.basename(filePath)}`);
            } else {
                console.log(`✨ No duplicate properties found in ${path.basename(filePath)}`);
            }
        }
    } catch (error) {
        console.error(`❌ Error cleaning ${filePath}:`, error);
    }
}

// Main execution
const dataDir = path.join(__dirname, '..', 'data');
const itemsFile = path.join(dataDir, 'items.json');

console.log('🚀 Starting cleanup of duplicate properties...');
cleanupDataFile(itemsFile);
console.log('✅ Cleanup completed!');
