const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// Initialize database
const itemsAdapter = new FileSync(path.join(__dirname, 'data', 'items.json'));
const itemsDb = low(itemsAdapter);

console.log('=== STOCK STATUS DEBUG ===\n');

const items = itemsDb.get('items').filter({ isActive: true }).value();

items.forEach(item => {
    if (!item.isServiceItem) {
        const stockStatus = item.stock.quantity <= item.stock.minLevel ? 'LOW STOCK' : 'IN STOCK';
        const quantity = item.stock.quantity;
        const minLevel = item.stock.minLevel;
        
        console.log(`${item.name}:`);
        console.log(`  Current Stock: ${quantity} ${item.unit}`);
        console.log(`  Minimum Level: ${minLevel} ${item.unit}`);
        console.log(`  Status: ${stockStatus} (${quantity} <= ${minLevel} = ${quantity <= minLevel})`);
        console.log('');
    }
});

console.log('=== END DEBUG ===');
