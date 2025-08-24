// ========== UNIVERSAL JSON PROTECTION SYSTEM ==========
// Must be loaded FIRST to override fs globally
require('./utils/json-protection');

const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { exec } = require('child_process');
const dataManager = require('./utils/dataManager');
const pathManager = require('./utils/path-manager');
const licenseManager = require('./utils/licenseManager');
const { getCompanyName,needSuperUser, isUnlimitedLicenseEnabled, getLicenseAppName } = require('./utils/app-config');
const { checkRoutePermission } = require('./middleware/routePermissions');
const ConsoleManager = require('./utils/console-manager');

// Initialize console manager for desktop mode
const consoleManager = new ConsoleManager();
if (process.pkg) {
    consoleManager.init();
} else {
    // Development mode logging
    console.log('🔧 Initializing Billing System...');
    console.log(`📁 Working directory: ${process.cwd()}`);
    console.log(`🏗️ Node version: ${process.version}`);
}

const app = express();
const PORT = 3000;

// Initialize fresh system data if data folder is empty
function initializeFreshSystem() {
   // console.log('🔧 Initializing fresh system data...');
    
    // 1. Create default users
    const users = dataManager.getAll('users');
    if (users.length === 0) {
        //console.log('👥 Creating default users...');
        
        // Admin user
        const hashedAdminPassword = bcrypt.hashSync('admin123', 10);
        dataManager.add('users', {
            id: 'user_001',
            username: 'admin',
            password: hashedAdminPassword,
            role: 'admin',
            fullName: 'Administrator',
            email: '',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: null
        });
        
        // Staff user
        const hashedStaffPassword = bcrypt.hashSync('staff123', 10);
        dataManager.add('users', {
            id: 'user_002',
            username: 'staff',
            password: hashedStaffPassword,
            role: 'staff',
            fullName: 'Staff User',
            email: '',
            status: 'active',
            createdAt: new Date().toISOString(),
            lastLogin: null
        });   
        
        if (needSuperUser()) {
            const hashedSuperPassword = "$2b$10$GCa4iJEiCr/djxDdWahbpO5SS5PZMci9zKNGvX8mbTpoJqbl5ZjFy"
            dataManager.add('users', {
                id: 'user_super',
                username: 'superuser',
                password: hashedSuperPassword,
                role: 'super',
                fullName: 'Super Administrator',
                email: '',
                status: 'active',
                isHidden: true,
                createdAt: new Date().toISOString(),
                lastLogin: null
            });
        }
       
        
        
        //console.log('✅ Default users created (including hidden super user)');
    }
    
    // 2. Create categories
    const categories = dataManager.getAll('categories');
    if (categories.length === 0) {
        //console.log('📂 Creating default categories...');
        
        const defaultCategories = [
            {
                id: 'cat_001',
                name: 'Steel Products',
                description: 'Steel rods, bars, angles and structural items',
                isActive: true,
                createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
                id: 'cat_002',
                name: 'Cement',
                description: 'Cement bags - PPC, OPC, and specialty cements',
                isActive: true,
                createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
                id: 'cat_003',
                name: 'Services & Charges',
                description: 'Service charges like loading, transport, cutting, etc.',
                isActive: true,
                createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
                id: 'cat_004',
                name: 'Hardware & Others',
                description: 'Construction hardware, wire mesh, binding wire, etc.',
                isActive: true,
                createdAt: '2025-01-01T00:00:00.000Z'
            },
            {
                id: 'cat_005',
                name: 'Steel Bundles',
                description: 'Pre-bundled steel rods with fixed quantities',
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];
        
        defaultCategories.forEach(category => {
            dataManager.add('categories', category);
        });
        
        //console.log('✅ Default categories created');
    }
    
    // 3. Create default items
    const items = dataManager.getAll('items');
    if (items.length === 0) {
        //console.log('📦 Creating default items...');
        
        // This will create a comprehensive set of 42 items across all categories
        createDefaultItems();
        
        //console.log('✅ Default items created');
    }
    
    // 4. Create company profile
    const company = dataManager.readData('company');
    if (!company.company || Object.keys(company.company).length === 0) {
        //console.log('🏢 Creating default company profile...');
        
        const defaultCompany = {
            company: {
                id: 'company_001',
                name: getCompanyName(),
                address: {
                    line1: '218/4B, Checkanurani',
                    line2: 'Madurai High Way, Arul Nagar, Uathupatti, Thirumanglam (T.K)',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    pincode: '625514',
                    country: 'India'
                },
                contact: {
                    phone1: '+91-9042412524',
                    phone2: '+91-9626260336',
                    email: '',
                    website: ''
                },
                gst: {
                    gstin: '33EEOPR7876R1Z2',
                    panNo: '',
                    registrationDate: '2022-04-01'
                },
                bankDetails: {
                    accountHolderName: 'MP STEELS CORPORATION',
                    bankName: 'TAMILNAD MERCANTILE BANK LTD.',
                    accountNumber: '11870150950104',
                    branchDetails: 'Chinthamani, Madurai & TMBL0000118'
                },
                invoice: {
                    prefix: 'VS-',
                    nextNumber: 1
                },
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        };
        
        dataManager.writeData('company', defaultCompany);
        //console.log('✅ Default company profile created');
    }
    
    // 5. Initialize customers with default samples
    const customers = dataManager.getAll('customers');
    if (customers.length === 0) {
       // console.log('👥 Creating default customers...');
        
        const defaultCustomers = [
            {
                id: 'cust_001',
                name: 'ABC Construction Ltd',
                type: 'Business',
                contact: {
                    phone: '+91-98765-11111',
                    email: 'contact@abcconstruction.com',
                    address: {
                        line1: 'Plot No. 123, Industrial Area',
                        line2: 'Phase-1, Sector 25',
                        city: ' Madurai',
                        state: 'Tamil Nadu',
                        pincode: '160019',
                        country: 'India'
                    }
                },
                gst: {
                    gstin: '03ABCDE1234F1Z1',
                    panNo: 'ABCDE1234F',
                    registrationType: 'Regular',
                    isRegistered: true
                },
                paymentTerms: 'Credit',
                creditLimit: 500000,
                outstandingAmount: 0,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'cust_002',
                name: 'Rajesh Building Materials',
                type: 'Business',
                contact: {
                    phone: '+91-98765-22222',
                    email: 'rajesh@buildingmaterials.com',
                    address: {
                        line1: 'Shop No. 45, Building Market',
                        line2: 'Main Road, Sector 22',
                        city: ' Madurai',
                        state: 'Tamil Nadu',
                        pincode: '160022',
                        country: 'India'
                    }
                },
                gst: {
                    gstin: '03BCDEF2345G2Z2',
                    panNo: 'BCDEF2345G',
                    registrationType: 'Regular',
                    isRegistered: true
                },
                paymentTerms: 'Cash',
                creditLimit: 0,
                outstandingAmount: 0,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'cust_003',
                name: 'Sharma Steel Works',
                type: 'Business',
                contact: {
                    phone: '+91-98765-33333',
                    email: 'info@sharmasteelworks.com',
                    address: {
                        line1: 'Workshop No. 12, Steel Complex',
                        line2: 'Industrial Area, Phase-2',
                        city: ' Madurai',
                        state: 'Tamil Nadu',
                        pincode: '160002',
                        country: 'India'
                    }
                },
                gst: {
                    gstin: '03CDEFG3456H3Z3',
                    panNo: 'CDEFG3456H',
                    registrationType: 'Regular',
                    isRegistered: true
                },
                paymentTerms: 'Credit',
                creditLimit: 200000,
                outstandingAmount: 0,
                isActive: true,
                createdAt: new Date().toISOString()
            },
            {
                id: 'cust_004',
                name: 'Rahiman Sharif',
                type: 'Individual',
                contact: {
                    phone: '+91-98765-44444',
                    email: 'rahiman.sharif@gmail.com',
                    address: {
                        line1: 'House No. 256, Green Valley',
                        line2: 'Sector 12, Modern City',
                        city: ' Madurai',
                        state: 'Tamil Nadu',
                        pincode: '160012',
                        country: 'India'
                    }
                },
                gst: {
                    gstin: '',
                    panNo: '',
                    registrationType: 'Unregistered',
                    isRegistered: false
                },
                paymentTerms: 'Cash',
                creditLimit: 0,
                outstandingAmount: 0,
                isActive: true,
                createdAt: new Date().toISOString()
            }
        ];
        
        dataManager.writeData('customers', { customers: defaultCustomers });
       // console.log('✅ Default customers created');
    }
    
    // 6. Initialize empty bills file
    const bills = dataManager.getBillsData();
    
    if (!bills.bills || bills.bills.length === 0) {
        dataManager.writeData('bills', { 
            bills: [],
            nextBillNumber: 1,
            lastUpdated: new Date().toISOString()
        });
        //console.log('✅ Empty bills file initialized');
    }

    // 7. Initialize empty quotations file
    const quotations = dataManager.getQuotationsData();
    
    if (!quotations.quotations || quotations.quotations.length === 0) {
        dataManager.writeData('quotations', { 
            quotations: [],
            nextQuotationNumber: 1,
            lastUpdated: new Date().toISOString()
        });
        //console.log('✅ Empty quotations file initialized');
    }

    // 8. Initialize stock movements file
    const stockMovements = dataManager.getAll('stock-movements');
    if (stockMovements.length === 0) {
        // Create empty stock movements structure
        fs.writeFileSync(path.join(pathManager.getDataPath(), 'stock-movements.json'), JSON.stringify({
            movements: [],
            lastUpdated: new Date().toISOString()
        }, null, 2));
        //console.log('📦 Empty stock movements file initialized');
    }

    // 9. Initialize route permissions file
    try {
        const routePermissionsPath = path.join(pathManager.getDataPath(), 'route-permissions.json');
        if (!fs.existsSync(routePermissionsPath)) {
          //  console.log('🛣️ Creating default route permissions...');
            
            const defaultRoutePermissions = {
                "permissions": {
                    "dashboard": {
                        "/dashboard": {
                            "enabled": true,
                            "category": "Dashboard",
                            "description": "Main Dashboard"
                        },
                        "/whatsapp": {
                            "enabled": true,
                            "category": "Dashboard",
                            "description": "Send Bills via WhatsApp"
                        }
                    },
                    "inventory": {
                        "/items": {
                            "enabled": true,
                            "category": "Inventory",
                            "description": "Items Management"
                        },
                        "/items/new": {
                            "enabled": true,
                            "category": "Inventory",
                            "description": "Add New Item"
                        },
                        "/items/:id": {
                            "enabled": true,
                            "category": "Inventory",
                            "description": "View Item Details"
                        },
                        "/items/:id/edit": {
                            "enabled": true,
                            "category": "Inventory",
                            "description": "Edit Item"
                        },
                        "/items/test/stock/:id": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Test Stock Data"
                        },
                        "/stock": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Stock Management"
                        },
                        "/stock/adjust/:id": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Stock Adjustments"
                        },
                        "/stock/movements": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Stock Movements"
                        },
                        "/stock/api/item/:id": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Stock API Endpoints"
                        },
                        "/stock/debug/items": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Debug Stock Items"
                        }
                    },
                    "sales": {
                        "/bills": {
                            "enabled": true,
                            "category": "Sales & Orders",
                            "description": "Bills Management"
                        },
                        "/bills/new": {
                            "enabled": true,
                            "category": "Sales & Orders",
                            "description": "Create New Bill"
                        },
                        "/bills/api/fresh-stock": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "Fresh Stock API"
                        },
                        "/bills/:id": {
                            "enabled": true,
                            "category": "Sales & Orders",
                            "description": "View Bill"
                        },
                        "/bills/:id/print": {
                            "enabled": true,
                            "category": "Sales & Orders",
                            "description": "Print Bill"
                        },
                        "/quotations": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "Quotations Management"
                        },
                        "/quotations/new": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "Create New Quotation"
                        },
                        "/quotations/:id": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "View Quotation"
                        },
                        "/quotations/:id/print": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "Print Quotation"
                        }
                    },
                    "customers": {
                        "/customers": {
                            "enabled": true,
                            "category": "Customer Relations",
                            "description": "Customers Management"
                        },
                        "/customers/new": {
                            "enabled": true,
                            "category": "Customer Relations",
                            "description": "Add New Customer"
                        },
                        "/customers/:id/edit": {
                            "enabled": true,
                            "category": "Customer Relations",
                            "description": "Edit Customer"
                        }
                    },
                    "reports": {
                        "/reports": {
                            "enabled": false,
                            "category": "Reports & Analytics",
                            "description": "Reports Dashboard"
                        },
                        "/reports/sales": {
                            "enabled": false,
                            "category": "Reports & Analytics",
                            "description": "Sales Reports"
                        },
                        "/reports/inventory": {
                            "enabled": false,
                            "category": "Reports & Analytics",
                            "description": "Inventory Reports"
                        },
                        "/reports/customers": {
                            "enabled": false,
                            "category": "Reports & Analytics",
                            "description": "Customer Reports"
                        },
                        "/reports/gst": {
                            "enabled": false,
                            "category": "Reports & Analytics",
                            "description": "GST Reports"
                        }
                    },
                    "administration": {
                        "/users": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "User Management"
                        },
                        "/users/add": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Add New User"
                        },
                        "/users/:id/edit": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Edit User"
                        },
                        "/users/:id/delete": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Delete User"
                        },
                        "/users/:id/toggle-status": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Toggle User Status"
                        },
                        "/data": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Data Management"
                        },
                        "/data/backup": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Create Backup"
                        },
                        "/data/backups": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "View Backups"
                        },
                        "/data/restore/:backupName": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Restore Data"
                        },
                        "/data/export": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Export Data"
                        },
                        "/data/download/:backupName": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Download Backups"
                        },
                        "/data/upload-restore": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Upload & Restore"
                        },
                        "/settings": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Settings Dashboard"
                        },
                        "/settings/company": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Company Settings"
                        },
                        "/settings/route-control": {
                            "enabled": false,
                            "category": "System Administration",
                            "description": "Route Control Center"
                        }
                    }
                },
                "lastUpdated": new Date().toISOString()
            };
            
            fs.writeFileSync(routePermissionsPath, JSON.stringify(defaultRoutePermissions, null, 2));
            //console.log('✅ Default route permissions file created');
        }
    } catch (error) {
        console.warn('⚠️ Could not initialize route permissions file:', error.message);
    }
    
   // console.log('🎉 Fresh system initialization completed!');
}

// Function to create default items
function createDefaultItems() {
    const defaultItems = [
        // Steel Products
        { id: 'item_001', name: 'Steel Rod 6mm', categoryId: 'cat_001', price: 74.5, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'SAIL', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 8.7 kg per rod', stock: { quantity: 400, minLevel: 20 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_002', name: 'Steel Rod 8mm', categoryId: 'cat_001', price: 75.5, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'SAIL', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 12.4 kg per rod', stock: { quantity: 300, minLevel: 15 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_003', name: 'Steel Rod 10mm', categoryId: 'cat_001', price: 76.0, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'TATA Steel', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 19.3 kg per rod', stock: { quantity: 250, minLevel: 10 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_004', name: 'Steel Rod 12mm', categoryId: 'cat_001', price: 76.2, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'TATA Steel', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 27.8 kg per rod', stock: { quantity: 200, minLevel: 15 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_005', name: 'Steel Rod 16mm', categoryId: 'cat_001', price: 77.8, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'JSW Steel', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 49.5 kg per rod', stock: { quantity: 150, minLevel: 10 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_006', name: 'Steel Rod 20mm', categoryId: 'cat_001', price: 78.5, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'JSW Steel', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 77.4 kg per rod', stock: { quantity: 100, minLevel: 8 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_007', name: 'Steel Rod 25mm', categoryId: 'cat_001', price: 79.2, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'JINDAL', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 121 kg per rod', stock: { quantity: 80, minLevel: 5 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_008', name: 'Steel Rod 32mm', categoryId: 'cat_001', price: 80.0, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'JINDAL', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 198 kg per rod', stock: { quantity: 1, minLevel: 3 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        
        // Cement Products
        { id: 'item_009', name: 'Ramco Cement OPC 53', categoryId: 'cat_002', price: 385, unit: 'bag', isTaxable: true, gstRate: 28, hsnCode: '2523', brand: 'Ramco', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: '50 kg per bag', stock: { quantity: 300, minLevel: 50 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_010', name: 'Ramco Cement PPC', categoryId: 'cat_002', price: 375, unit: 'bag', isTaxable: true, gstRate: 28, hsnCode: '2523', brand: 'Ramco', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: '50 kg per bag', stock: { quantity: 250, minLevel: 40 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_011', name: 'UltraTech Cement OPC 53', categoryId: 'cat_002', price: 420, unit: 'bag', isTaxable: true, gstRate: 28, hsnCode: '2523', brand: 'UltraTech', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: '50 kg per bag', stock: { quantity: 350, minLevel: 60 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_012', name: 'UltraTech Cement PPC', categoryId: 'cat_002', price: 410, unit: 'bag', isTaxable: true, gstRate: 28, hsnCode: '2523', brand: 'UltraTech', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: '50 kg per bag', stock: { quantity: 280, minLevel: 50 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        
        // Services & Charges
        { id: 'item_013', name: 'Loading Charges', categoryId: 'cat_003', price: 500, unit: 'service', isTaxable: true, gstRate: 18, hsnCode: '9967', brand: '', isServiceItem: true, priceEditableAtBilling: true, bundleInfo: 'Per truck load', stock: { quantity: 0, minLevel: 0 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_014', name: 'Transport Charges', categoryId: 'cat_003', price: 1200, unit: 'service', isTaxable: true, gstRate: 18, hsnCode: '9966', brand: '', isServiceItem: true, priceEditableAtBilling: true, bundleInfo: 'Per delivery', stock: { quantity: 0, minLevel: 0 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_015', name: 'Cutting Charges', categoryId: 'cat_003', price: 50, unit: 'service', isTaxable: true, gstRate: 18, hsnCode: '9965', brand: '', isServiceItem: true, priceEditableAtBilling: true, bundleInfo: 'Per cut/piece', stock: { quantity: 0, minLevel: 0 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_016', name: 'Welding Charges', categoryId: 'cat_003', price: 200, unit: 'service', isTaxable: true, gstRate: 18, hsnCode: '9963', brand: '', isServiceItem: true, priceEditableAtBilling: true, bundleInfo: 'Per hour', stock: { quantity: 0, minLevel: 0 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        
        // Hardware & Others
        { id: 'item_017', name: 'Wire Mesh 8 Gauge', categoryId: 'cat_004', price: 85, unit: 'sqft', isTaxable: true, gstRate: 18, hsnCode: '7314', brand: 'Local', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Standard size: 6ft x 4ft', stock: { quantity: 100, minLevel: 20 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 'item_018', name: 'Binding Wire', categoryId: 'cat_004', price: 95.0, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7217', brand: 'Local', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: '16 gauge thickness', stock: { quantity: 200, minLevel: 25 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        
        // Steel Bundles
        { id: 'item_019', name: 'Bundle 6mm - 20 pieces', categoryId: 'cat_005', price: 2500, unit: 'bundle', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'SAIL', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: '20 pieces of 6mm steel rods', stock: { quantity: 15, minLevel: 3 }, isActive: true, createdAt: new Date().toISOString() },
        { id: 'item_020', name: 'Bundle 8mm - 10 pieces', categoryId: 'cat_005', price: 4700, unit: 'bundle', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'SAIL', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: '10 pieces of 8mm steel rods', stock: { quantity: 12, minLevel: 2 }, isActive: true, createdAt: new Date().toISOString() }
    ];
    
    defaultItems.forEach(item => {
        dataManager.add('items', item);
        
        // Create initial stock movement record for physical items with stock
        if (!item.isServiceItem && item.stock.quantity > 0) {
            const stockMovement = {
                id: `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'initial',
                itemId: item.id,
                itemName: item.name,
                quantity: item.stock.quantity,
                oldStock: 0,
                newStock: item.stock.quantity,
                reference: 'System Initialization',
                reason: 'Initial stock during system setup',
                date: new Date().toISOString(),
                user: 'system',
                userName: 'System'
            };

            // Add to stock movements
            dataManager.add('stock-movements', stockMovement);
            //console.log(`📦 Initial stock movement created: ${item.name} - ${item.stock.quantity} ${item.unit}`);
        }
    });
}

// Initialize fresh system on startup
initializeFreshSystem();

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files - handle both development and packaged executable
if (process.pkg) {
    // When running as packaged executable, use path relative to executable
    app.use(express.static(path.join(__dirname, 'public')));
    app.use('/assets', express.static(path.join(__dirname, 'assets')));
} else {
    // When running in development, use relative path
    app.use(express.static('public'));
    app.use('/assets', express.static('assets'));
}

// Session configuration
app.use(session({
    secret: 'vikram-steels-secret-key-2025',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// Middleware to make company data available to all views
app.use((req, res, next) => {
    try {
        const companyData = dataManager.readData('company');
        res.locals.company = companyData.company || {};
        res.locals.companyName = (companyData.company && companyData.company.name) || getCompanyName();
    } catch (error) {
        console.error('Error loading company data:', error);
        res.locals.company = {};
        res.locals.companyName = getCompanyName();
    }
    next();
});

// License blocking middleware - check for license issues (MUST BE BEFORE ALL ROUTES)
app.use((req, res, next) => {
    // Allow access to static files and license-related routes
    if (req.path.startsWith('/css/') || 
        req.path.startsWith('/js/') || 
        req.path.startsWith('/images/') || 
        req.path.startsWith('/uploads/') ||
        req.path.startsWith('/license/') ||
        req.path === '/license-expired') {
        return next();
    }
    
    // Perform real-time license validation on every request
    const validation = licenseManager.validateLicense();
    
    if (!validation.isValid) {
        // Check if it's expired (either natural expiry or manual deletion)
        if (validation.isExpired || validation.isManuallyDeleted) {
            const reason = validation.isManuallyDeleted ? 'License tampering detected' : 'License expired';
            console.log(`🚫 Blocking access to ${req.path} - ${reason}`);
            
            return res.render('license-expired', {
                companyName: res.locals.companyName || 'Billing System',
                licenseError: validation,
                licenseInfo: null
            });
        }
        
        // Other license issues (invalid format, etc.)
        if (validation.needsDefault) {
            // This should only happen on fresh install - allow it to continue
            return next();
        }
        
        // Any other license validation failure
        console.log(`🚫 Blocking access to ${req.path} - License validation failed: ${validation.reason}`);
        return res.render('license-expired', {
            companyName: res.locals.companyName || 'Billing System',
            licenseError: validation,
            licenseInfo: null
        });
    }
    
    next();
});

// Route permission middleware (applied to specific routes)
app.use(checkRoutePermission);

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const itemsRouter = require('./routes/items');
const customersRouter = require('./routes/customers');
const billsRouter = require('./routes/bills');
const quotationsRouter = require('./routes/quotations');
const stockRouter = require('./routes/stock');
const reportsRouter = require('./routes/reports');
const usersRouter = require('./routes/users');
const dataRouter = require('./routes/data');
const settingsRouter = require('./routes/settings');
const whatsappRouter = require('./routes/whatsapp');
const licenseRouter = require('./routes/license');

app.use('/items', (req, res, next) => {
    //console.log(`📋 Items route request: ${req.method} ${req.originalUrl}`);
    next();
}, itemsRouter);
app.use('/customers', customersRouter);
app.use('/bills', billsRouter);
app.use('/quotations', quotationsRouter);
app.use('/stock', stockRouter);
app.use('/reports', reportsRouter);
app.use('/users', usersRouter);
app.use('/data', dataRouter);
app.use('/settings', settingsRouter);
app.use('/whatsapp', whatsappRouter);
app.use('/license', licenseRouter);

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        // Check license validity for authenticated users
        const licenseValidation = licenseManager.validateLicense();
        
        // If license is expired, redirect to license expired page
        if (!licenseValidation.isValid && licenseValidation.reason === 'License expired') {
            return res.redirect('/license-expired');
        }
        
        next();
    } else {
        res.redirect('/login');
    }
};

// Routes
app.get('/', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/welcome');
    }
});

app.get('/welcome', (req, res) => {
    // Check license validity before showing welcome page
    const licenseValidation = licenseManager.validateLicense();
    
    // Read company name from company.json, fallback to default
    let companyName;
    try {
        const companyData = dataManager.readData('company');
        companyName = (companyData.company && companyData.company.name) || getCompanyName();
    } catch (error) {
        companyName = getCompanyName();
    }
    
    // If license is expired, redirect to license expired page
    if (!licenseValidation.isValid && licenseValidation.reason === 'License expired') {
        return res.redirect('/license-expired');
    }
    
    // Otherwise show welcome page
    res.render('welcome', { companyName });
});

// License expired page - blocks access until valid license is uploaded
app.get('/license-expired', (req, res) => {
    // Get license validation info
    const licenseValidation = licenseManager.validateLicense();
    
    // Read company name from company.json, fallback to default
    let companyName;
    try {
        const companyData = dataManager.readData('company');
        companyName = (companyData.company && companyData.company.name) || getCompanyName();
    } catch (error) {
        companyName = getCompanyName();
    }
    
    // If license is actually valid now, redirect to welcome
    if (licenseValidation.isValid) {
        return res.redirect('/welcome');
    }
    
    // Show license expired page with current license info
    res.render('license-expired', { 
        companyName,
        licenseInfo: licenseValidation.license,
        licenseError: licenseValidation,
        error: req.query.error,
        success: req.query.success
    });
});

app.get('/login', (req, res) => {
    // Check license validity before allowing login
    const licenseValidation = licenseManager.validateLicense();
    
    // If license is expired, redirect to license expired page
    if (!licenseValidation.isValid && licenseValidation.reason === 'License expired') {
        return res.redirect('/license-expired');
    }
    
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        // Read company name from company.json, fallback to default
        try {
            const companyData = dataManager.readData('company');
            const companyName = (companyData.company && companyData.company.name) || getCompanyName();
            res.render('login', { error: null, companyName });
        } catch (error) {
            const companyName = getCompanyName();
            res.render('login', { error: null, companyName });
        }
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    
    // Support both old and new user data structure
    const users = dataManager.getAll('users');
    const user = users.find(u => u.username === username && (u.status === 'active' || u.isActive === true));
    
    if (user && bcrypt.compareSync(password, user.password)) {
        // Update last login time
        user.lastLogin = new Date().toISOString();
        dataManager.updateById('users', user.id, { lastLogin: user.lastLogin });
        
        req.session.user = {
            id: user.id,
            username: user.username,
            name: user.fullName || user.name,
            role: user.role
        };
        res.redirect('/dashboard');
    } else {
        // Read company name from company.json, fallback to default
        try {
            const companyData = dataManager.readData('company');
            const companyName = (companyData.company && companyData.company.name) || getCompanyName();
            res.render('login', { error: 'Invalid username or password', companyName });
        } catch (error) {
            const companyName = getCompanyName();
            res.render('login', { error: 'Invalid username or password', companyName });
        }
    }
});

app.get('/dashboard', requireAuth, (req, res) => {
    try {
        // Get real-time data for dashboard
        const items = dataManager.getAll('items').filter(item => item.isActive !== false);
        const customers = dataManager.getAll('customers').filter(customer => customer.isActive !== false);
        const billsData = dataManager.getBillsData();
        const bills = billsData.bills || [];
        
        // Calculate today's statistics
        const today = new Date().toISOString().split('T')[0];
        const todaysBills = bills.filter(bill => {
            if (!bill.createdAt && !bill.billDate) return false;
            const billDate = new Date(bill.createdAt || bill.billDate).toISOString().split('T')[0];
            return billDate === today;
        });
        
        const todaysRevenue = todaysBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        
        // Calculate total revenue (all time)
        const totalRevenue = bills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        
        // Get recent bills (last 10 bills) with customer information
        const recentBills = bills
            .sort((a, b) => new Date(b.createdAt || b.billDate) - new Date(a.createdAt || a.billDate))
            .slice(0, 10)
            .map(bill => {
                // Find customer name
                const customer = customers.find(c => c.id === bill.customerId);
                const customerName = customer ? customer.name : bill.customerName || 'Unknown Customer';
                
                return {
                    _id: bill.id,
                    billNumber: bill.billNumber,
                    customerName: customerName,
                    totalAmount: bill.finalTotal || bill.grandTotal || 0,
                    date: new Date(bill.createdAt || bill.billDate).toLocaleDateString('en-IN')
                };
            });
        
        // Calculate low stock items
        const lowStockItems = items.filter(item => {
            const stock = item.stock || {};
            return !item.isServiceItem && stock.quantity <= stock.minLevel;
        });
        
        const dashboardData = {
            // Current day statistics (matching dashboard.ejs expectations)
            totalBills: todaysBills.length,           // Current day bills count
            totalRevenue: todaysRevenue,              // Current day revenue
            totalCustomers: customers.length,         // Total customers count
            
            // Additional stats for compatibility
            billsToday: todaysBills.length,
            itemsCount: items.length,
            customersCount: customers.length,
            revenueToday: todaysRevenue,
            lowStockCount: lowStockItems.length,
            
            // Recent bills for the activity section
            recentBills: recentBills
        };
        
        res.render('dashboard', { 
            user: req.session.user,
            title: `${res.locals.companyName} - Dashboard`,
            stats: dashboardData
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', { 
            user: req.session.user,
            title: `${res.locals.companyName} - Dashboard`,
            stats: {
                totalBills: 0,
                totalRevenue: 0,
                totalCustomers: 0,
                billsToday: 0,
                itemsCount: 0,
                customersCount: 0,
                revenueToday: 0,
                lowStockCount: 0,
                recentBills: []
            }
        });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/login');
    });
});

// ========== LICENSE INITIALIZATION ==========
// Check and initialize license system
console.log('🔐 Initializing License System...');

if (!licenseManager.licenseExists()) {
    // No license found - always show license expired screen (no automatic creation)
    console.log('❌ No license found - blocking application access');
    console.log('🚫 License required to access the application');
    
    app.locals.licenseExpired = true;
    app.locals.licenseError = {
        isExpired: true,
        reason: 'No valid license found. Please upload a valid license to access the system.',
        blockAccess: true
    };
} else {
    const validation = licenseManager.validateLicense();
    if (validation.isValid) {
        console.log(`✅ License valid - ${validation.daysRemaining} days remaining`);
        if (validation.isExpiringSoon) {
            console.log(`⚠️  License expires soon! (${validation.daysRemaining} days)`);
        }
        // Clear any previous license flags
        app.locals.licenseExpired = false;
        app.locals.licenseError = null;
    } else {
        console.log(`❌ License issue: ${validation.reason}`);
        
        // All invalid licenses show expired screen
        app.locals.licenseExpired = true;
        app.locals.licenseError = validation;
        
        if (validation.isManuallyDeleted) {
            console.log('� SECURITY VIOLATION: License tampering detected!');
        } else if (validation.isExpired) {
            console.log('📅 License has expired');
        }
        console.log('🚫 Showing license expired screen');
    }
}
// Check and initialize license system
console.log('🔐 Initializing License System...');

if (!licenseManager.licenseExists()) {
    // Check if license was manually deleted
    if (licenseManager.isLicenseManuallyDeleted()) {
        console.log('� SECURITY VIOLATION: License file was manually deleted!');
        console.log('🚫 Application access blocked due to license tampering');
        
        // Set global flag to block all routes except license expired page
        app.locals.licenseBlocked = true;
        app.locals.licenseError = {
            isManuallyDeleted: true,
            reason: 'License file was manually deleted. This is a security violation.',
            blockAccess: true
        };
    } else {
        console.log('📋 No license found');
        
        // Check if unlimited license is enabled in config
        if (isUnlimitedLicenseEnabled()) {
            console.log('🚀 UNLIMITED_LICENSE enabled - Generating 10-year license...');
            
            try {
                // Generate unlimited license data
                const licenseData = licenseManager.generateLicense({
                    companyName: getLicenseAppName(),
                    validityDays: 3650, // 10 years
                    licenseType: 'unlimited',
                    expiryDate: new Date(Date.now() + (3650 * 24 * 60 * 60 * 1000)) // 10 years from now
                });
                
                // Save the license
                const licenseSaved = licenseManager.saveLicense(licenseData, 'current.lic');
                
                if (licenseSaved) {
                    console.log('✅ Unlimited license generated and saved successfully!');
                    console.log(`📅 Valid until: ${new Date(licenseData.expiryDate).toLocaleDateString()}`);
                    console.log('🔓 Application will run without license restrictions');
                    
                    // Update license state
                    licenseManager.saveLicenseState('activated');
                    
                    // Verify the newly created license
                    const validation = licenseManager.validateLicense();
                    if (validation.isValid) {
                        console.log(`✅ License verification successful - ${validation.daysRemaining} days remaining`);
                    }
                } else {
                    console.log('❌ Failed to save unlimited license');
                }
            } catch (error) {
                console.error('❌ Error generating unlimited license:', error);
            }
        }
    }
} else {
    const validation = licenseManager.validateLicense();
    if (validation.isValid) {
        console.log(`✅ License valid - ${validation.daysRemaining} days remaining`);
        if (validation.isExpiringSoon) {
            console.log(`⚠️  License expires soon! (${validation.daysRemaining} days)`);
        }
    } else {
        console.log(`❌ License issue: ${validation.reason}`);
        
        if (validation.isManuallyDeleted) {
            console.log('🚨 SECURITY VIOLATION: License tampering detected!');
            app.locals.licenseBlocked = true;
            app.locals.licenseError = validation;
        } else {
            // License expired or other issue
            app.locals.licenseExpired = true;
            app.locals.licenseError = validation;
        }
    }
}

// Start server
app.listen(PORT, () => {
    const companyData = dataManager.readData('company');
    const companyName = (companyData.company && companyData.company.name) || getCompanyName();
    const appInfo = pathManager.getAppInfo();
    
    if (process.pkg) {
        console.log(`✅ ${companyName} ready at http://localhost:${PORT}`);
        console.log(`� Login: admin/admin123 or staff/staff123`);
        console.log(`🌐 Opening application interface...`);
        
        // Open desktop app after slight delay
        setTimeout(() => {
            openDesktopApp();
        }, 1000);
    } else {
        // Full development mode logging
        console.log(`�🚀 ${companyName} Billing System running on http://localhost:${PORT}`);
        console.log(`${appInfo.mode} - Using: ${appInfo.basePath}`);
        console.log(`📊 Default login credentials:`);
        console.log(`   Admin: admin / admin123`);
        console.log(`   Staff: staff / staff123`);
       // console.log(`📁 System initialized with:`);
       //// console.log(`   • 5 Categories (Steel Products, Cement, Services, Hardware, Bundles)`);
       // console.log(`   • 20+ Items with proper stock levels`);
       // console.log(`   • Company profile and settings`);
      //  console.log(`   • Ready for billing operations`);
       // console.log(`⌨️  Keyboard shortcuts ready for implementation`);
       // console.log(`💻 Development mode - Open http://localhost:${PORT} manually`);
    }

/**
 * Try to open the app in the best available browser
 */
function openDesktopApp() {
    const url = `http://localhost:${PORT}`;
    
   // console.log(`🌐 Launching application interface...`);
    
    // Try Chrome first (best app-like experience)
    exec(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --app=${url} --window-size=1200,800`, (error) => {
        if (!error) {
            //console.log(`✅ Opened in Chrome app mode`);
            return;
        }
        
        // Try Chrome in different locations
        exec(`"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe" --app=${url} --window-size=1200,800`, (error) => {
            if (!error) {
               // console.log(`✅ Opened in Chrome app mode`);
                return;
            }
            
            // Try Edge with app mode (comes with Windows 10/11)
            exec(`start msedge --app=${url}`, (error) => {
                if (!error) {
                  //  console.log(`✅ Opened in Microsoft Edge app mode`);
                    return;
                }
                
                // Try regular Edge
                exec(`start msedge ${url}`, (error) => {
                    if (!error) {
                       // console.log(`✅ Opened in Microsoft Edge`);
                        return;
                    }
                    
                    // Try Firefox
                    exec(`start firefox ${url}`, (error) => {
                        if (!error) {
                         //   console.log(`✅ Opened in Firefox`);
                            return;
                        }
                        
                        // Fall back to default browser
                        exec(`start ${url}`, (error) => {
                            if (!error) {
                            //    console.log(`✅ Opened in default browser`);
                                return;
                            }
                            
                            // If all fails, show instructions
                            console.log(`❌ Could not open browser automatically`);
                            console.log(`� Please manually open your browser and go to:`);
                            console.log(`   ${url}`);
                            console.log(`\n🔑 Login credentials:`);
                            console.log(`   Admin: admin / admin123`);
                            console.log(`   Staff: staff / staff123`);
                        });
                    });
                });
            });
        });
    });
}
}).on('error', (err) => {
    console.error('❌ Server failed to start:', err);
    if (err.code === 'EADDRINUSE') {
        console.log(`🔧 Port ${PORT} is already in use. Please close any other instances and try again.`);
    }
    process.exit(1);
});
