const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const path = require('path');
const fs = require('fs');

console.log('🔧 Items router loaded');

// Middleware to require authentication
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).render('error', { 
            message: 'Access denied. Admin privileges required.',
            user: req.session.user 
        });
    }
};

// GET /items - Items list page
router.get('/', requireAuth, (req, res) => {
    try {
        // Add cache busting query parameter if not present
        if (!req.query.t) {
            return res.redirect(`/items?t=${Date.now()}`);
        }
        
        // Set strong cache control headers to prevent caching
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date().toUTCString(),
            'ETag': 'W/"' + Date.now() + '"'
        });
        
        // Use dataManager for consistent file system operations
        console.log(`[FILE SYSTEM] Reading directly from file system using dataManager...`);
        
        // Get all items and categories using dataManager
        const showInactive = req.query.showInactive === 'true';
        const allItems = dataManager.getAll('items');
        
        // Filter items based on whether to show inactive items
        const items = showInactive ? allItems : allItems.filter(item => item.isActive === true);
        const categories = dataManager.getAll('categories').filter(cat => cat.isActive === true);
        
        // Add category names to items
        const itemsWithCategories = items.map(item => {
            const category = categories.find(cat => cat.id === item.categoryId);
            return {
                ...item,
                categoryName: category ? category.name : 'Unknown'
            };
        });

        // Debug logging
        const cementPPC = itemsWithCategories.find(item => item.name === 'Cement PPC');
        const steelRod8mm = itemsWithCategories.find(item => item.name === 'Steel Rod 8mm');
        const steelRod9mm = itemsWithCategories.find(item => item.name === 'Steel rod 9mm');
        
        console.log(`\n[ITEMS ROUTE DEBUG] ${new Date().toISOString()}`);
        console.log(`=== DATAMANAGER FILE SYSTEM READ RESULTS ===`);
        console.log(`  Cement PPC: ${cementPPC ? cementPPC.stock.quantity : 'NOT FOUND'} quantity, Min: ${cementPPC ? cementPPC.stock.minLevel : 'N/A'}`);
        console.log(`  Steel Rod 8mm: ${steelRod8mm ? steelRod8mm.stock.quantity : 'NOT FOUND'} quantity, Min: ${steelRod8mm ? steelRod8mm.stock.minLevel : 'N/A'}`);
        console.log(`  Steel rod 9mm: ${steelRod9mm ? steelRod9mm.stock.quantity : 'NOT FOUND'} quantity, Min: ${steelRod9mm ? steelRod9mm.stock.minLevel : 'N/A'}`);
        console.log(`  Total items being sent: ${itemsWithCategories.length}`);
        console.log(`  Low stock count: ${items.filter(item => !item.isServiceItem && item.stock.quantity <= item.stock.minLevel).length}`);
        console.log(`  showInactive: ${showInactive}`);
        console.log(`  inactiveCount: ${allItems.filter(item => item.isActive === false).length}`);
        console.log(`=== USING DATAMANAGER FOR CONSISTENCY ===\n`);

        res.render('items/index', {
            title: `Items Management - ${res.locals.companyName}`,
            user: req.session.user,
            items: itemsWithCategories,
            categories: categories,
            totalItems: items.length,
            lowStockItems: items.filter(item => !item.isServiceItem && item.stock.quantity <= item.stock.minLevel).length,
            showInactive: showInactive,
            inactiveCount: allItems.filter(item => item.isActive === false).length,
            timestamp: Date.now(), // Force browser refresh
            refreshTime: new Date().toISOString() // Additional cache buster
        });
    } catch (error) {
        console.error('Error loading items:', error);
        res.status(500).render('error', { 
            message: 'Error loading items',
            user: req.session.user 
        });
    }
});

// GET /items/new - Add new item form (Admin only)
router.get('/new', requireAuth, requireAdmin, (req, res) => {
    try {
        const categories = dataManager.findBy('categories', { isActive: true });
        
        res.render('items/form', {
            title: `Add New Item - ${res.locals.companyName}`,
            user: req.session.user,
            categories: categories,
            item: null, // New item
            isEdit: false
        });
    } catch (error) {
        console.error('Error loading new item form:', error);
        res.status(500).render('error', { 
            message: 'Error loading form',
            user: req.session.user 
        });
    }
});

// Test route to check stock data directly
router.get('/test/stock/:id', requireAuth, (req, res) => {
    try {
        const item = dataManager.findById('items', req.params.id);
        res.json({
            message: 'Direct file system read',
            item: item ? {
                id: item.id,
                name: item.name,
                stock: item.stock,
                timestamp: new Date().toISOString()
            } : null
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET /items/:id - View individual item
router.get('/:id', requireAuth, (req, res) => {
    try {
        // Set cache control headers to prevent caching
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        });
        
        const item = dataManager.findById('items', req.params.id);
        const categories = dataManager.findBy('categories', { isActive: true });
        
        if (!item) {
            return res.status(404).render('error', { 
                message: 'Item not found',
                user: req.session.user 
            });
        }

        // Debug logging to see exact stock data
        console.log(`DEBUG ${new Date().toISOString()} - Item ${req.params.id} stock data:`, {
            id: item.id,
            name: item.name,
            stockQuantity: item.stock.quantity,
            stockMinLevel: item.stock.minLevel,
            fullStock: item.stock
        });

        const category = categories.find(cat => cat.id === item.categoryId);
        const itemWithCategory = {
            ...item,
            categoryName: category ? category.name : 'Unknown Category'
        };

        res.render('items/view', {
            title: `${item.name} - Item Details - ${res.locals.companyName}`,
            user: req.session.user,
            item: itemWithCategory,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading item:', error);
        res.status(500).render('error', { 
            message: 'Error loading item details',
            user: req.session.user 
        });
    }
});

// GET /items/:id/edit - Edit item form (Admin only)
router.get('/:id/edit', requireAuth, requireAdmin, (req, res) => {
    try {
        const item = dataManager.findBy('items', { id: req.params.id  })[0];
        const categories = dataManager.findBy('categories', { isActive: true });
        
        if (!item) {
            return res.status(404).render('error', { 
                message: 'Item not found',
                user: req.session.user 
            });
        }

        res.render('items/form', {
            title: `Edit Item - ${res.locals.companyName}`,
            user: req.session.user,
            categories: categories,
            item: item,
            isEdit: true
        });
    } catch (error) {
        console.error('Error loading edit item form:', error);
        res.status(500).render('error', { 
            message: 'Error loading form',
            user: req.session.user 
        });
    }
});

// POST /items - Create new item (Admin only)
router.post('/', requireAuth, requireAdmin, (req, res) => {
    try {
        const {
            name, categoryId, newCategoryName, price, unit, newUnitName, isTaxable, gstRate, newGstRate, hsnCode,
            brand, isServiceItem, priceEditableAtBilling, bundleInfo,
            stockQuantity, minLevel, barcode
        } = req.body;

        // Debug logging to see exactly what was received
        console.log('🔍 Form submission debug:', {
            unit, newUnitName,
            gstRate, newGstRate,
            isTaxable
        });

        let finalCategoryId = categoryId;
        let finalUnit = unit;
        let finalGstRate = (gstRate !== '__new__') ? (parseFloat(gstRate) || 0) : 0;

        // Handle new category creation
        if (categoryId === '__new__') {
            if (!newCategoryName || !newCategoryName.trim()) {
                return res.redirect('/items/new?error=New category name is required');
            }

            const categoryName = newCategoryName.trim();
            
            // Check if category with same name already exists
            const existingCategories = dataManager.getAll('categories');
            const existingCategory = existingCategories.find(cat => 
                cat.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (existingCategory) {
                // Use existing category instead of creating duplicate
                finalCategoryId = existingCategory.id;
                console.log(`📁 Using existing category: ${categoryName} (${existingCategory.id})`);
            } else {
                // Create new category with proper ID generation
                const existingIds = existingCategories.map(cat => {
                    const match = cat.id.match(/^cat_(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                });
                const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
                const nextCategoryId = `cat_${String(maxId + 1).padStart(3, '0')}`;
                
                const newCategory = {
                    id: nextCategoryId,
                    name: categoryName,
                    description: `Auto-created category: ${categoryName}`,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    createdBy: req.session.user ? req.session.user.id : 'system'
                };

                // Add category to database
                const categoryAdded = dataManager.add('categories', newCategory);
                if (categoryAdded) {
                    finalCategoryId = nextCategoryId;
                    console.log(`✅ New category created: ${categoryName} (${nextCategoryId})`);
                } else {
                    console.error(`❌ Failed to create category: ${categoryName}`);
                    return res.redirect('/items/new?error=Failed to create new category');
                }
            }
        }

        // Handle custom unit
        if (unit === '__new__') {
            if (!newUnitName || !newUnitName.trim()) {
                return res.redirect('/items/new?error=New unit name is required');
            }
            finalUnit = newUnitName.trim();
            console.log(`✅ Custom unit specified: ${finalUnit}`);
        }

        // Handle custom GST rate
        if (gstRate === '__new__') {
            if (!newGstRate || isNaN(parseFloat(newGstRate)) || parseFloat(newGstRate) < 0 || parseFloat(newGstRate) > 100) {
                return res.redirect('/items/new?error=Valid GST rate (0-100%) is required');
            }
            finalGstRate = parseFloat(newGstRate);
            console.log(`✅ Custom GST rate specified: ${finalGstRate}%`);
        }

        // Generate new item ID
        const existingItems = dataManager.getAll('items');
        const nextId = `item_${String(existingItems.length + 1).padStart(3, '0')}`;

        const newItem = {
            id: nextId,
            name: name.trim(),
            categoryId: finalCategoryId,
            price: parseFloat(price),
            unit: finalUnit.trim(),
            isTaxable: isTaxable === 'true',
            gstRate: isTaxable === 'true' ? finalGstRate : 0,
            hsnCode: hsnCode ? hsnCode.trim() : '',
            brand: brand ? brand.trim() : '',
            isServiceItem: isServiceItem === 'true',
            priceEditableAtBilling: priceEditableAtBilling === 'true',
            bundleInfo: bundleInfo ? bundleInfo.trim() : '',
            barcode: barcode ? barcode.trim() : '',
            stock: {
                quantity: isServiceItem === 'true' ? 0 : parseInt(stockQuantity) || 0,
                minLevel: isServiceItem === 'true' ? 0 : parseInt(minLevel) || 0
            },
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        dataManager.add('items', newItem);

        // Success message includes category creation info if applicable
        let successMessage = 'Item added successfully';
        if (categoryId === '__new__') {
            successMessage += ` (New category "${newCategoryName.trim()}" created)`;
        }
        if (unit === '__new__') {
            successMessage += ` (Custom unit "${finalUnit}" added)`;
        }
        if (gstRate === '__new__') {
            successMessage += ` (Custom GST rate ${finalGstRate}% added)`;
        }

        res.redirect(`/items?success=${encodeURIComponent(successMessage)}`);
    } catch (error) {
        console.error('Error creating item:', error);
        res.redirect('/items/new?error=Error creating item');
    }
});

// POST /items/:id/deactivate - Deactivate item (Admin only)
router.post('/:id/deactivate', requireAuth, requireAdmin, (req, res) => {
    console.log(`🔥 DEACTIVATE ROUTE HIT: ${req.params.id}`);
    try {
        // Soft delete - set isActive to false
        const success = dataManager.updateById('items', req.params.id, {
            isActive: false,
            updatedAt: new Date().toISOString()
        });

        if (success) {
            console.log(`✅ Item ${req.params.id} deactivated successfully`);
            res.redirect('/items?success=Item deactivated successfully&t=' + Date.now());
        } else {
            console.log(`❌ Failed to deactivate item ${req.params.id}`);
            res.redirect('/items?error=Item not found&t=' + Date.now());
        }
    } catch (error) {
        console.error('Error deactivating item:', error);
        res.redirect('/items?error=Error deactivating item&t=' + Date.now());
    }
});

// POST /items/:id/activate - Activate item (Admin only)
router.post('/:id/activate', requireAuth, requireAdmin, (req, res) => {
    try {
        // Reactivate - set isActive to true
        const success = dataManager.updateById('items', req.params.id, {
            isActive: true,
            updatedAt: new Date().toISOString()
        });

        if (success) {
            console.log(`✅ Item ${req.params.id} activated successfully`);
            res.redirect('/items?success=Item activated successfully&t=' + Date.now());
        } else {
            console.log(`❌ Failed to activate item ${req.params.id}`);
            res.redirect('/items?error=Item not found&t=' + Date.now());
        }
    } catch (error) {
        console.error('Error activating item:', error);
        res.redirect('/items?error=Error activating item&t=' + Date.now());
    }
});

// POST /items/:id/delete - Permanently delete item (Admin only)
router.post('/:id/delete', requireAuth, requireAdmin, (req, res) => {
    try {
        // Hard delete - permanently remove from database
        const success = dataManager.deleteById('items', req.params.id);

        if (success) {
            console.log(`✅ Item ${req.params.id} permanently deleted`);
            res.redirect('/items?success=Item permanently deleted&t=' + Date.now());
        } else {
            console.log(`❌ Failed to delete item ${req.params.id}`);
            res.redirect('/items?error=Item not found&t=' + Date.now());
        }
    } catch (error) {
        console.error('Error deleting item:', error);
        res.redirect('/items?error=Error deleting item&t=' + Date.now());
    }
});

// PUT /items/:id - Update item (Admin only)
router.post('/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const {
            name, categoryId, newCategoryName, price, unit, newUnitName, isTaxable, gstRate, newGstRate, hsnCode,
            brand, isServiceItem, priceEditableAtBilling, bundleInfo,
            stockQuantity, minLevel, barcode
        } = req.body;

        // Debug logging to see exactly what was received in update
        console.log('🔍 Update form submission debug:', {
            unit, newUnitName,
            gstRate, newGstRate,
            isTaxable
        });

        let finalCategoryId = categoryId;
        let finalUnit = unit;
        let finalGstRate = (gstRate !== '__new__') ? (parseFloat(gstRate) || 0) : 0;

        // Handle new category creation
        if (categoryId === '__new__') {
            if (!newCategoryName || !newCategoryName.trim()) {
                return res.redirect(`/items/${req.params.id}/edit?error=New category name is required`);
            }

            const categoryName = newCategoryName.trim();
            
            // Check if category with same name already exists
            const existingCategories = dataManager.getAll('categories');
            const existingCategory = existingCategories.find(cat => 
                cat.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (existingCategory) {
                // Use existing category instead of creating duplicate
                finalCategoryId = existingCategory.id;
                console.log(`📁 Using existing category: ${categoryName} (${existingCategory.id})`);
            } else {
                // Create new category with proper ID generation
                const existingIds = existingCategories.map(cat => {
                    const match = cat.id.match(/^cat_(\d+)$/);
                    return match ? parseInt(match[1]) : 0;
                });
                const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
                const nextCategoryId = `cat_${String(maxId + 1).padStart(3, '0')}`;
                
                const newCategory = {
                    id: nextCategoryId,
                    name: categoryName,
                    description: `Auto-created category: ${categoryName}`,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    createdBy: req.session.user ? req.session.user.id : 'system'
                };

                // Add category to database
                const categoryAdded = dataManager.add('categories', newCategory);
                if (categoryAdded) {
                    finalCategoryId = nextCategoryId;
                    console.log(`✅ New category created: ${categoryName} (${nextCategoryId})`);
                } else {
                    console.error(`❌ Failed to create category: ${categoryName}`);
                    return res.redirect(`/items/${req.params.id}/edit?error=Failed to create new category`);
                }
            }
        }

        // Handle custom unit
        if (unit === '__new__') {
            if (!newUnitName || !newUnitName.trim()) {
                return res.redirect(`/items/${req.params.id}/edit?error=New unit name is required`);
            }
            finalUnit = newUnitName.trim();
            console.log(`✅ Custom unit specified: ${finalUnit}`);
        }

        // Handle custom GST rate
        if (gstRate === '__new__') {
            if (!newGstRate || isNaN(parseFloat(newGstRate)) || parseFloat(newGstRate) < 0 || parseFloat(newGstRate) > 100) {
                return res.redirect(`/items/${req.params.id}/edit?error=Valid GST rate (0-100%) is required`);
            }
            finalGstRate = parseFloat(newGstRate);
            console.log(`✅ Custom GST rate specified: ${finalGstRate}%`);
        }

        // Update the item using dataManager
        const updateData = {
            name: name.trim(),
            categoryId: finalCategoryId,
            price: parseFloat(price),
            unit: finalUnit.trim(),
            isTaxable: isTaxable === 'true',
            gstRate: isTaxable === 'true' ? finalGstRate : 0,
            hsnCode: hsnCode ? hsnCode.trim() : '',
            brand: brand ? brand.trim() : '',
            isServiceItem: isServiceItem === 'true',
            priceEditableAtBilling: priceEditableAtBilling === 'true',
            bundleInfo: bundleInfo ? bundleInfo.trim() : '',
            barcode: barcode ? barcode.trim() : '',
            'stock.quantity': isServiceItem === 'true' ? 0 : parseInt(stockQuantity) || 0,
            'stock.minLevel': isServiceItem === 'true' ? 0 : parseInt(minLevel) || 0,
            updatedAt: new Date().toISOString()
        };

        const success = dataManager.updateById('items', req.params.id, updateData);

        if (success) {
            console.log(`✅ Item ${req.params.id} updated successfully`);
            
            // Success message includes category creation info if applicable
            let successMessage = 'Item updated successfully';
            if (categoryId === '__new__') {
                successMessage += ` (New category "${newCategoryName.trim()}" created)`;
            }
            if (unit === '__new__') {
                successMessage += ` (Custom unit "${finalUnit}" added)`;
            }
            if (gstRate === '__new__') {
                successMessage += ` (Custom GST rate ${finalGstRate}% added)`;
            }
            
            res.redirect(`/items?success=${encodeURIComponent(successMessage)}&t=` + Date.now());
        } else {
            console.log(`❌ Failed to update item ${req.params.id}`);
            res.redirect('/items?error=Item not found&t=' + Date.now());
        }
    } catch (error) {
        console.error('Error updating item:', error);
        res.redirect(`/items/${req.params.id}/edit?error=Error updating item&t=` + Date.now());
    }
});

module.exports = router;
