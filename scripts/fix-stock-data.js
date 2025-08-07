// Script to fix corrupted stock data in items.json
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// Initialize database
const adapter = new FileSync(path.join(__dirname, '../data/items.json'));
const db = low(adapter);

function fixStockData() {
    console.log('🔧 Starting stock data migration...');
    
    const items = db.get('items').value();
    let fixedCount = 0;
    
    items.forEach(item => {
        // Check if item has corrupted data (both stock.quantity and "stock.quantity" fields)
        if (item.hasOwnProperty('stock.quantity')) {
            console.log(`📦 Fixing item: ${item.name} (${item.id})`);
            console.log(`   Old stock: ${item.stock.quantity}, Corrupted field: ${item['stock.quantity']}`);
            
            // Use the newer stock.quantity value (from adjustments)
            item.stock.quantity = item['stock.quantity'];
            
            // Remove the corrupted field
            delete item['stock.quantity'];
            
            // Add migration metadata
            item.stockDataMigrated = true;
            item.stockMigratedAt = new Date().toISOString();
            
            console.log(`   ✅ Fixed stock quantity: ${item.stock.quantity}`);
            fixedCount++;
        }
    });
    
    // Save changes
    db.write();
    
    console.log(`\n🎉 Migration completed! Fixed ${fixedCount} items.`);
    console.log('   All stock quantities are now properly nested under stock.quantity');
}

// Run the migration
fixStockData();
