const dataManager = require('./utils/dataManager');

console.log('🔍 Testing Revenue Calculation...\n');

// Get bills data
const billsData = dataManager.getBillsData();
const bills = billsData.bills || [];

console.log(`📊 Total bills found: ${bills.length}`);

// Get today's date
const today = new Date().toISOString().split('T')[0];
console.log(`📅 Today's date: ${today}`);

// Check each bill's date
bills.forEach((bill, index) => {
    const billDate = bill.createdAt ? bill.createdAt.split('T')[0] : 'unknown';
    const isToday = billDate === today;
    console.log(`  Bill ${index + 1}: ${bill.billNumber} - ${billDate} ${isToday ? '✅ TODAY' : ''} - ₹${bill.finalTotal || 0}`);
});

// Calculate today's bills
const todaysBills = bills.filter(bill => {
    if (!bill.createdAt) return false;
    return bill.createdAt.split('T')[0] === today;
});

console.log(`\n📋 Today's bills: ${todaysBills.length}`);

// Calculate today's revenue
const todaysRevenue = todaysBills.reduce((sum, bill) => {
    const amount = bill.finalTotal || bill.grandTotal || 0;
    console.log(`  Adding ₹${amount} from bill ${bill.billNumber}`);
    return sum + amount;
}, 0);

console.log(`\n💰 Today's revenue: ₹${todaysRevenue}`);
console.log(`💰 Formatted: ₹${todaysRevenue.toLocaleString()}`);

console.log('\n✅ Revenue calculation test complete!');
