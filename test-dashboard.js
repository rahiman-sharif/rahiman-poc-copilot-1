const dataManager = require('./utils/dataManager');

// Test dashboard data calculations
const items = dataManager.getAll('items').filter(item => item.isActive !== false);
const customers = dataManager.getAll('customers').filter(customer => customer.isActive !== false);
const billsData = dataManager.getBillsData();
const bills = billsData.bills || [];

console.log('📊 Dashboard Data Verification:');
console.log('  Items count:', items.length);
console.log('  Customers count:', customers.length);

// Calculate today's statistics
const today = new Date().toISOString().split('T')[0];
const todaysBills = bills.filter(bill => bill.createdAt && bill.createdAt.split('T')[0] === today);
const todaysRevenue = todaysBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);

console.log('  Bills today:', todaysBills.length);
console.log('  Revenue today: ₹' + todaysRevenue.toLocaleString());

// Check for low stock items
const lowStock = items.filter(item => {
    const stock = item.stock || {};
    return !item.isServiceItem && stock.quantity <= stock.minLevel;
});

console.log('  Low stock items:', lowStock.length);

if (lowStock.length > 0) {
    console.log('  Low stock details:');
    lowStock.forEach(item => {
        console.log(`    - ${item.name}: ${item.stock.quantity} (min: ${item.stock.minLevel})`);
    });
}

if (todaysBills.length > 0) {
    console.log('  Today\'s bills details:');
    todaysBills.forEach(bill => {
        console.log(`    - Bill #${bill.billNumber}: ₹${(bill.finalTotal || bill.grandTotal || 0).toLocaleString()}`);
    });
}

console.log('✅ Dashboard data verification complete!');
