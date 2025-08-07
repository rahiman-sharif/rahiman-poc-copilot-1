const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// Test script to verify stock updates are working properly
const adapter = new FileSync(path.join(__dirname, '../data/items.json'));
const db = low(adapter);

console.log('🧪 Testing Stock Update Consistency...');

// Read current stock
const item = db.get('items').find({ id: 'item_001' }).value();
console.log(`📦 Current stock for ${item.name}: ${item.stock.quantity} ${item.unit}`);

// Update stock using the proper method
const testQuantity = 999;
console.log(`🔄 Setting stock to ${testQuantity}...`);

db.get('items')
  .find({ id: 'item_001' })
  .update('stock.quantity', () => testQuantity)
  .update('lastStockUpdate', () => new Date().toISOString())
  .write();

console.log('✅ Stock updated using .update() method');

// Verify the update
const updatedItem = db.get('items').find({ id: 'item_001' }).value();
console.log(`✅ Verified stock: ${updatedItem.stock.quantity} ${updatedItem.unit}`);

if (updatedItem.stock.quantity === testQuantity) {
    console.log('🎉 SUCCESS: Stock update working correctly!');
} else {
    console.log('❌ FAILURE: Stock update not working!');
}

// Reset to original value
db.get('items')
  .find({ id: 'item_001' })
  .update('stock.quantity', () => 1)
  .write();

console.log('🔄 Reset stock back to 1');
