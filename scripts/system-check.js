const dataManager = require('../utils/dataManager');

console.log('🔍 Running comprehensive system check...\n');

// Test 1: Data Manager basic operations
console.log('1. Testing DataManager basic operations:');
try {
    const items = dataManager.getAll('items');
    console.log(`   ✅ Items loaded: ${items.length} items`);
    
    const customers = dataManager.getAll('customers');
    console.log(`   ✅ Customers loaded: ${customers.length} customers`);
    
    const bills = dataManager.getBillsData();
    console.log(`   ✅ Bills loaded: ${bills.bills.length} bills`);
} catch (error) {
    console.log(`   ❌ DataManager error: ${error.message}`);
}

// Test 2: Nested property updates
console.log('\n2. Testing nested property updates:');
try {
    const testItem = dataManager.findById('items', 'item_010');
    if (testItem) {
        console.log(`   📦 Found test item: ${testItem.name}`);
        console.log(`   📊 Current stock: ${testItem.stock.quantity} ${testItem.unit}`);
        console.log(`   📈 Current min level: ${testItem.stock.minLevel}`);
        
        // Test updating minimum level
        const success = dataManager.updateById('items', 'item_010', {
            'stock.minLevel': 25
        });
        
        if (success) {
            const updatedItem = dataManager.findById('items', 'item_010');
            console.log(`   ✅ Min level updated to: ${updatedItem.stock.minLevel}`);
            
            // Reset to original value
            dataManager.updateById('items', 'item_010', {
                'stock.minLevel': 0
            });
            console.log(`   🔄 Reset min level to original value`);
        } else {
            console.log(`   ❌ Failed to update min level`);
        }
    } else {
        console.log(`   ❌ Test item not found`);
    }
} catch (error) {
    console.log(`   ❌ Nested property test error: ${error.message}`);
}

// Test 3: Check for data consistency
console.log('\n3. Checking data consistency:');
try {
    const items = dataManager.getAll('items');
    let inconsistentItems = 0;
    
    items.forEach(item => {
        // Check for flat properties that should be nested
        if (item.hasOwnProperty('stock.quantity') || item.hasOwnProperty('stock.minLevel')) {
            inconsistentItems++;
            console.log(`   ⚠️  Item ${item.id} has flat stock properties`);
        }
    });
    
    if (inconsistentItems === 0) {
        console.log(`   ✅ All items have consistent data structure`);
    } else {
        console.log(`   ❌ Found ${inconsistentItems} items with inconsistent data`);
    }
} catch (error) {
    console.log(`   ❌ Data consistency check error: ${error.message}`);
}

// Test 4: File system operations
console.log('\n4. Testing file system operations:');
try {
    const fs = require('fs');
    const path = require('path');
    
    const dataDir = path.join(__dirname, '..', 'data');
    const files = ['items.json', 'customers.json', 'bills.json', 'categories.json'];
    
    files.forEach(file => {
        const filePath = path.join(dataDir, file);
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            console.log(`   ✅ ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
        } else {
            console.log(`   ❌ ${file}: File not found`);
        }
    });
} catch (error) {
    console.log(`   ❌ File system test error: ${error.message}`);
}

console.log('\n🎉 System check completed!');
