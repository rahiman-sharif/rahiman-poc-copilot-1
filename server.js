const express = require('express');
const session = require('express-session');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const dataManager = require('./utils/dataManager');
const pathManager = require('./utils/path-manager');
const { getCompanyName } = require('./utils/app-config');
const { checkRoutePermission } = require('./middleware/routePermissions');

const app = express();
const PORT = 3000;

// Initialize fresh system data if data folder is empty
function initializeFreshSystem() {
    console.log('🔧 Initializing fresh system data...');
    
    // 1. Create default users
    const users = dataManager.getAll('users');
    if (users.length === 0) {
        console.log('👥 Creating default users...');
        
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
        
        // Super user (hidden)
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
        
        console.log('✅ Default users created (including hidden super user)');
    }
    
    // 2. Create categories
    const categories = dataManager.getAll('categories');
    if (categories.length === 0) {
        console.log('📂 Creating default categories...');
        
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
        
        console.log('✅ Default categories created');
    }
    
    // 3. Create default items
    const items = dataManager.getAll('items');
    if (items.length === 0) {
        console.log('📦 Creating default items...');
        
        // This will create a comprehensive set of 42 items across all categories
        createDefaultItems();
        
        console.log('✅ Default items created');
    }
    
    // 4. Create company profile
    const company = dataManager.readData('company');
    if (!company.company || Object.keys(company.company).length === 0) {
        console.log('🏢 Creating default company profile...');
        
        const defaultCompany = {
            company: {
                id: 'company_001',
                name: getCompanyName(),
                address: {
                    line1: '218/4B, Checkanurani',
                    line2: 'Madurai High Way, Arul Nagar, Uathupatti, Thirumanglam (T.K)',
                    city: 'Madurai',
                    state: 'Tamil Nadu',
                    pincode: '625020',
                    country: 'India'
                },
                contact: {
                    phone1: '+91-9042412524',
                    phone2: '+91-9626260336',
                    email: 'info@vikramsteels.com',
                    website: 'www.vikramsteels.com'
                },
                gst: {
                    gstin: '33EEOPR7876R1ZZ',
                    panNo: 'ABCDE1234F',
                    registrationDate: '2022-04-01'
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
        console.log('✅ Default company profile created');
    }
    
    // 5. Initialize customers with default samples
    const customers = dataManager.getAll('customers');
    if (customers.length === 0) {
        console.log('👥 Creating default customers...');
        
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
        console.log('✅ Default customers created');
    }
    
    // 6. Initialize empty bills file
    const bills = dataManager.getBillsData();
    
    if (!bills.bills || bills.bills.length === 0) {
        dataManager.writeData('bills', { 
            bills: [],
            nextBillNumber: 1,
            lastUpdated: new Date().toISOString()
        });
        console.log('✅ Empty bills file initialized');
    }

    // 7. Initialize empty quotations file
    const quotations = dataManager.getQuotationsData();
    
    if (!quotations.quotations || quotations.quotations.length === 0) {
        dataManager.writeData('quotations', { 
            quotations: [],
            nextQuotationNumber: 1,
            lastUpdated: new Date().toISOString()
        });
        console.log('✅ Empty quotations file initialized');
    }

    // 8. Initialize stock movements file
    const stockMovements = dataManager.getAll('stock-movements');
    if (stockMovements.length === 0) {
        // Create empty stock movements structure
        fs.writeFileSync(path.join(pathManager.getDataPath(), 'stock-movements.json'), JSON.stringify({
            movements: [],
            lastUpdated: new Date().toISOString()
        }, null, 2));
        console.log('📦 Empty stock movements file initialized');
    }

    // 9. Initialize route permissions file
    try {
        const routePermissionsPath = path.join(pathManager.getDataPath(), 'route-permissions.json');
        if (!fs.existsSync(routePermissionsPath)) {
            console.log('🛣️ Creating default route permissions...');
            
            const defaultRoutePermissions = {
                "permissions": {
                    "dashboard": {
                        "/dashboard": {
                            "enabled": true,
                            "category": "Dashboard",
                            "description": "Main Dashboard"
                        }
                    },
                    "inventory": {
                        "/items": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Items Management"
                        },
                        "/items/new": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "Add New Item"
                        },
                        "/items/:id": {
                            "enabled": false,
                            "category": "Inventory",
                            "description": "View Item Details"
                        },
                        "/items/:id/edit": {
                            "enabled": false,
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
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "Bills Management"
                        },
                        "/bills/new": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "Create New Bill"
                        },
                        "/bills/api/fresh-stock": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "Fresh Stock API"
                        },
                        "/bills/:id": {
                            "enabled": false,
                            "category": "Sales & Orders",
                            "description": "View Bill"
                        },
                        "/bills/:id/print": {
                            "enabled": false,
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
                            "enabled": false,
                            "category": "Customer Relations",
                            "description": "Customers Management"
                        },
                        "/customers/new": {
                            "enabled": false,
                            "category": "Customer Relations",
                            "description": "Add New Customer"
                        },
                        "/customers/:id/edit": {
                            "enabled": false,
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
            console.log('✅ Default route permissions file created');
        }
    } catch (error) {
        console.warn('⚠️ Could not initialize route permissions file:', error.message);
    }
    
    console.log('🎉 Fresh system initialization completed!');
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
        { id: 'item_008', name: 'Steel Rod 32mm', categoryId: 'cat_001', price: 80.0, unit: 'kg', isTaxable: true, gstRate: 18, hsnCode: '7213', brand: 'JINDAL', isServiceItem: false, priceEditableAtBilling: false, bundleInfo: 'Each bundle ≈ 198 kg per rod', stock: { quantity: 50, minLevel: 3 }, isActive: true, createdAt: '2025-01-01T00:00:00.000Z' },
        
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
            console.log(`📦 Initial stock movement created: ${item.name} - ${item.stock.quantity} ${item.unit}`);
        }
    });
}

// Initialize fresh system on startup
initializeFreshSystem();

// Middleware setup
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));

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

app.use('/items', (req, res, next) => {
    console.log(`📋 Items route request: ${req.method} ${req.originalUrl}`);
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

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
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
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    if (req.session.user) {
        res.redirect('/dashboard');
    } else {
        res.render('login', { error: null });
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
        res.render('login', { error: 'Invalid username or password' });
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
        const todaysBills = bills.filter(bill => bill.createdAt && bill.createdAt.split('T')[0] === today);
        const todaysRevenue = todaysBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        
        // Calculate low stock items
        const lowStockItems = items.filter(item => {
            const stock = item.stock || {};
            return !item.isServiceItem && stock.quantity <= stock.minLevel;
        });
        
        const dashboardData = {
            billsToday: todaysBills.length,
            itemsCount: items.length,
            customersCount: customers.length,
            revenueToday: todaysRevenue,
            lowStockCount: lowStockItems.length
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
                billsToday: 0,
                itemsCount: 0,
                customersCount: 0,
                revenueToday: 0,
                lowStockCount: 0
            }
        });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        res.redirect('/login');
    });
});

// Start server
app.listen(PORT, () => {
    const companyData = dataManager.readData('company');
    const companyName = (companyData.company && companyData.company.name) || getCompanyName();
    const appInfo = pathManager.getAppInfo();
    
    console.log(`🚀 ${companyName} Billing System running on http://localhost:${PORT}`);
    console.log(`${appInfo.mode} - Using: ${appInfo.basePath}`);
    console.log(`📊 Default login credentials:`);
    console.log(`   Admin: admin / admin123`);
    console.log(`   Staff: staff / staff123`);
    console.log(`📁 System initialized with:`);
    console.log(`   • 5 Categories (Steel Products, Cement, Services, Hardware, Bundles)`);
    console.log(`   • 20+ Items with proper stock levels`);
    console.log(`   • Company profile and settings`);
    console.log(`   • Ready for billing operations`);
    console.log(`⌨️  Keyboard shortcuts ready for implementation`);
});
