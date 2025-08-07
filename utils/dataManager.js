const fs = require('fs');
const path = require('path');

class DataManager {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.files = {
            items: path.join(this.dataDir, 'items.json'),
            customers: path.join(this.dataDir, 'customers.json'),
            bills: path.join(this.dataDir, 'bills.json'),
            categories: path.join(this.dataDir, 'categories.json'),
            users: path.join(this.dataDir, 'users.json'),
            company: path.join(this.dataDir, 'company.json'),
            settings: path.join(this.dataDir, 'settings.json'),
            stock: path.join(this.dataDir, 'stock.json')
        };
    }

    // Read data from file
    readData(collection) {
        try {
            const filePath = this.files[collection];
            if (!filePath) {
                throw new Error(`Invalid collection: ${collection}`);
            }
            
            if (!fs.existsSync(filePath)) {
                // Create empty structure if file doesn't exist
                const emptyData = { [collection]: [] };
                this.writeData(collection, emptyData);
                return emptyData;
            }
            
            const rawData = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(rawData);
        } catch (error) {
            console.error(`Error reading ${collection}:`, error);
            return { [collection]: [] };
        }
    }

    // Write data to file
    writeData(collection, data) {
        try {
            const filePath = this.files[collection];
            if (!filePath) {
                throw new Error(`Invalid collection: ${collection}`);
            }
            
            // Ensure directory exists
            if (!fs.existsSync(this.dataDir)) {
                fs.mkdirSync(this.dataDir, { recursive: true });
            }
            
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error(`Error writing ${collection}:`, error);
            return false;
        }
    }

    // Get all records from a collection
    getAll(collection) {
        const data = this.readData(collection);
        return data[collection] || [];
    }

    // Find record by ID
    findById(collection, id) {
        const records = this.getAll(collection);
        return records.find(record => record.id === id);
    }

    // Find records by criteria
    findBy(collection, criteria) {
        const records = this.getAll(collection);
        return records.filter(record => {
            return Object.keys(criteria).every(key => {
                if (key.includes('.')) {
                    // Handle nested properties like 'stock.quantity'
                    const keys = key.split('.');
                    let value = record;
                    for (const k of keys) {
                        value = value?.[k];
                    }
                    return value === criteria[key];
                }
                return record[key] === criteria[key];
            });
        });
    }

    // Add new record
    add(collection, record) {
        try {
            const data = this.readData(collection);
            if (!data[collection]) {
                data[collection] = [];
            }
            
            data[collection].push(record);
            return this.writeData(collection, data);
        } catch (error) {
            console.error(`Error adding to ${collection}:`, error);
            return false;
        }
    }

    // Update record by ID
    updateById(collection, id, updateData) {
        try {
            const data = this.readData(collection);
            if (!data[collection]) {
                return false;
            }
            
            const index = data[collection].findIndex(record => record.id === id);
            if (index === -1) {
                return false;
            }
            
            // Handle nested property updates (e.g., 'stock.quantity': value)
            const processedUpdateData = {};
            
            for (const [key, value] of Object.entries(updateData)) {
                if (key.includes('.')) {
                    // Handle nested properties like 'stock.quantity'
                    const keys = key.split('.');
                    let target = processedUpdateData;
                    
                    for (let i = 0; i < keys.length - 1; i++) {
                        if (!target[keys[i]]) {
                            target[keys[i]] = {};
                        }
                        target = target[keys[i]];
                    }
                    
                    target[keys[keys.length - 1]] = value;
                } else {
                    processedUpdateData[key] = value;
                }
            }
            
            // Deep merge update data and clean up duplicate flat properties
            data[collection][index] = this.deepMerge(data[collection][index], processedUpdateData);
            data[collection][index].updatedAt = new Date().toISOString();
            
            // Clean up any flat properties that should be nested (e.g., remove 'stock.quantity' if 'stock' object exists)
            this.cleanupFlatProperties(data[collection][index], updateData);
            
            return this.writeData(collection, data);
        } catch (error) {
            console.error(`Error updating ${collection} with ID ${id}:`, error);
            return false;
        }
    }

    // Update nested property (like stock.quantity)
    updateNestedProperty(collection, id, propertyPath, value) {
        try {
            const data = this.readData(collection);
            if (!data[collection]) {
                return false;
            }
            
            const index = data[collection].findIndex(record => record.id === id);
            if (index === -1) {
                return false;
            }
            
            // Update nested property
            const keys = propertyPath.split('.');
            let target = data[collection][index];
            
            for (let i = 0; i < keys.length - 1; i++) {
                if (!target[keys[i]]) {
                    target[keys[i]] = {};
                }
                target = target[keys[i]];
            }
            
            target[keys[keys.length - 1]] = value;
            data[collection][index].updatedAt = new Date().toISOString();
            
            return this.writeData(collection, data);
        } catch (error) {
            console.error(`Error updating nested property ${propertyPath} in ${collection}:`, error);
            return false;
        }
    }

    // Delete record by ID
    deleteById(collection, id) {
        try {
            const data = this.readData(collection);
            if (!data[collection]) {
                return false;
            }
            
            const index = data[collection].findIndex(record => record.id === id);
            if (index === -1) {
                return false;
            }
            
            data[collection].splice(index, 1);
            return this.writeData(collection, data);
        } catch (error) {
            console.error(`Error deleting from ${collection} with ID ${id}:`, error);
            return false;
        }
    }

    // Get next ID for a collection
    getNextId(collection, prefix = '') {
        const records = this.getAll(collection);
        if (records.length === 0) {
            return `${prefix}001`;
        }
        
        const lastId = records
            .map(record => record.id)
            .filter(id => id.startsWith(prefix))
            .sort()
            .pop();
        
        if (!lastId) {
            return `${prefix}001`;
        }
        
        const numPart = parseInt(lastId.replace(prefix, '')) + 1;
        return `${prefix}${numPart.toString().padStart(3, '0')}`;
    }

    // Deep merge objects
    deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }

    // Clean up flat properties that have been converted to nested
    cleanupFlatProperties(record, updateData) {
        for (const key of Object.keys(updateData)) {
            if (key.includes('.')) {
                const flatKey = key;
                if (record.hasOwnProperty(flatKey)) {
                    delete record[flatKey];
                }
            }
        }
    }

    // Backup data
    backup() {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupDir = path.join(this.dataDir, 'backups', timestamp);
            
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            
            Object.keys(this.files).forEach(collection => {
                const sourcePath = this.files[collection];
                const backupPath = path.join(backupDir, `${collection}.json`);
                
                if (fs.existsSync(sourcePath)) {
                    fs.copyFileSync(sourcePath, backupPath);
                }
            });
            
            console.log(`Backup created: ${backupDir}`);
            return backupDir;
        } catch (error) {
            console.error('Backup failed:', error);
            return null;
        }
    }

    // Special method for bills collection that might have different structure
    getBillsData() {
        const data = this.readData('bills');
        return {
            bills: data.bills || [],
            nextBillNumber: data.nextBillNumber || 1
        };
    }

    // Update next bill number
    updateNextBillNumber(number) {
        try {
            const data = this.readData('bills');
            data.nextBillNumber = number;
            return this.writeData('bills', data);
        } catch (error) {
            console.error('Error updating next bill number:', error);
            return false;
        }
    }

    // Get company data (might be single object, not array)
    getCompanyData() {
        const data = this.readData('company');
        return data.company || {};
    }

    // Get company data (alias for settings compatibility)
    getCompany() {
        return this.getCompanyData();
    }

    // Save company data
    saveCompany(companyData) {
        try {
            const data = { company: companyData };
            return this.writeData('company', data);
        } catch (error) {
            console.error('Error saving company data:', error);
            return false;
        }
    }

    // Get users data for user management
    async getUsers() {
        try {
            const data = this.readData('users');
            const users = data.users || [];
            
            // Normalize user data structure for compatibility
            return users.map(user => ({
                id: user.id,
                username: user.username,
                password: user.password,
                role: user.role,
                fullName: user.fullName || user.name || user.username,
                email: user.email || '',
                status: user.status || (user.isActive ? 'active' : 'inactive'),
                createdAt: user.createdAt,
                lastLogin: user.lastLogin || null
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            return [];
        }
    }

    // Save users data for user management
    async saveUsers(users) {
        try {
            const data = { users: users };
            return this.writeData('users', data);
        } catch (error) {
            console.error('Error saving users:', error);
            return false;
        }
    }
}

module.exports = new DataManager();
