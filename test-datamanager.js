// Test dataManager methods
const dataManager = require('./utils/dataManager');

async function testDataManager() {
    try {
        console.log('Testing dataManager methods...');
        
        console.log('1. Testing getUsers()...');
        const users = await dataManager.getUsers();
        console.log(`   Users loaded: ${users.length} users found`);
        
        console.log('2. Testing getSettings()...');
        const settings = await dataManager.getSettings();
        console.log(`   Settings loaded:`, typeof settings);
        console.log(`   Settings keys:`, Object.keys(settings));
        
        console.log('3. Testing getCompany()...');
        const company = await dataManager.getCompany();
        console.log(`   Company loaded:`, typeof company);
        console.log(`   Company name:`, company.name || 'No name');
        
        console.log('✅ All dataManager methods working');
        
    } catch (error) {
        console.error('❌ DataManager error:', error);
    }
}

testDataManager();
