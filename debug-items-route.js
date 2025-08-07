const express = require('express');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

// Initialize database - same as items route
const itemsAdapter = new FileSync(path.join(__dirname, 'data', 'items.json'));
const categoriesAdapter = new FileSync(path.join(__dirname, 'data', 'categories.json'));

const itemsDb = low(itemsAdapter);
const categoriesDb = low(categoriesAdapter);

console.log('=== DEBUGGING ITEMS ROUTE DATA ===\n');

// Simulate exactly what the items route does
console.log('1. Force fresh read from database:');
const items = itemsDb.read().get('items').filter({ isActive: true }).value();
const categories = categoriesDb.read().get('categories').filter({ isActive: true }).value();

console.log(`Found ${items.length} items`);

// Add category names to items
const itemsWithCategories = items.map(item => {
    const category = categories.find(cat => cat.id === item.categoryId);
    return {
        ...item,
        categoryName: category ? category.name : 'Unknown'
    };
});

// Check specific items
const cementPPC = itemsWithCategories.find(item => item.name === 'Cement PPC');
const steelRod8mm = itemsWithCategories.find(item => item.name === 'Steel Rod 8mm');

console.log('\n2. Cement PPC data:');
if (cementPPC) {
    console.log(`   Name: ${cementPPC.name}`);
    console.log(`   Stock Quantity: ${cementPPC.stock.quantity}`);
    console.log(`   Min Level: ${cementPPC.stock.minLevel}`);
    console.log(`   Should be LOW STOCK: ${cementPPC.stock.quantity <= cementPPC.stock.minLevel}`);
    console.log(`   Status: ${cementPPC.stock.quantity <= cementPPC.stock.minLevel ? 'LOW STOCK' : 'IN STOCK'}`);
} else {
    console.log('   NOT FOUND!');
}

console.log('\n3. Steel Rod 8mm data:');
if (steelRod8mm) {
    console.log(`   Name: ${steelRod8mm.name}`);
    console.log(`   Stock Quantity: ${steelRod8mm.stock.quantity}`);
    console.log(`   Min Level: ${steelRod8mm.stock.minLevel}`);
    console.log(`   Should be LOW STOCK: ${steelRod8mm.stock.quantity <= steelRod8mm.stock.minLevel}`);
    console.log(`   Status: ${steelRod8mm.stock.quantity <= steelRod8mm.stock.minLevel ? 'LOW STOCK' : 'IN STOCK'}`);
} else {
    console.log('   NOT FOUND!');
}

console.log('\n4. Low stock items calculation:');
const lowStockItems = items.filter(item => !item.isServiceItem && item.stock.quantity <= item.stock.minLevel);
console.log(`   Total low stock items: ${lowStockItems.length}`);
lowStockItems.forEach(item => {
    console.log(`   - ${item.name}: ${item.stock.quantity} <= ${item.stock.minLevel}`);
});

console.log('\n=== END DEBUG ===');
