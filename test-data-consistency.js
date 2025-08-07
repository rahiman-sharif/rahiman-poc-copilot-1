const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// Initialize database
const itemsAdapter = new FileSync(path.join(__dirname, 'data', 'items.json'));
const itemsDb = low(itemsAdapter);

console.log('=== DATA CONSISTENCY CHECK ===\n');

// Test both read methods
console.log('1. Testing simple .get() method:');
const itemsSimple = itemsDb.get('items').filter({ isActive: true }).value();
console.log(`Found ${itemsSimple.length} items`);

console.log('\n2. Testing .read().get() method:');
const itemsFresh = itemsDb.read().get('items').filter({ isActive: true }).value();
console.log(`Found ${itemsFresh.length} items`);

console.log('\n3. Comparing specific items:');

// Check Cement PPC
const cementSimple = itemsSimple.find(item => item.name === 'Cement PPC');
const cementFresh = itemsFresh.find(item => item.name === 'Cement PPC');

console.log('Cement PPC:');
console.log(`  Simple method: ${cementSimple ? cementSimple.stock.quantity : 'NOT FOUND'} ${cementSimple ? cementSimple.unit : ''}`);
console.log(`  Fresh method:  ${cementFresh ? cementFresh.stock.quantity : 'NOT FOUND'} ${cementFresh ? cementFresh.unit : ''}`);

// Check Steel Rod 8mm
const steelSimple = itemsSimple.find(item => item.name === 'Steel Rod 8mm');
const steelFresh = itemsFresh.find(item => item.name === 'Steel Rod 8mm');

console.log('\nSteel Rod 8mm:');
console.log(`  Simple method: ${steelSimple ? steelSimple.stock.quantity : 'NOT FOUND'} ${steelSimple ? steelSimple.unit : ''}`);
console.log(`  Fresh method:  ${steelFresh ? steelFresh.stock.quantity : 'NOT FOUND'} ${steelFresh ? steelFresh.unit : ''}`);

console.log('\n=== END CHECK ===');
