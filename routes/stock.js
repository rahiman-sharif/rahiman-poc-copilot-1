const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const path = require('path');
const fs = require('fs');

// Middleware to require authentication
function requireAuth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// GET /stock - Stock dashboard
router.get('/', requireAuth, (req, res) => {
    try {
        // Set strong cache control headers to prevent caching
        res.set({
            'Cache-Control': 'no-cache, no-store, must-revalidate, private, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
            'Last-Modified': new Date().toUTCString(),
            'ETag': 'W/"' + Date.now() + '"'
        });
        
        console.log('🔍 Stock route: Fresh read from file system');
        
        // Force fresh read from file system
        const allItems = dataManager.getAll('items');
        
        // Debug: Log all items and their active status
        console.log('📋 All items status:');
        allItems.forEach(item => {
            if (item.name.includes('20mm')) {
                console.log(`   - ${item.name}: isActive=${item.isActive}, isServiceItem=${item.isServiceItem}`);
            }
        });
        
        // Filter out service items and inactive items - only show active physical inventory items
        const items = allItems.filter(item => !item.isServiceItem && item.isActive === true);
        
        console.log(`📊 Found ${items.length} active physical items for stock dashboard`);
        
        // Calculate stock statistics
        const stockStats = {
            totalItems: items.length,
            lowStockItems: items.filter(item => item.stock.quantity <= item.stock.minLevel).length,
            outOfStockItems: items.filter(item => item.stock.quantity === 0).length,
            totalStockValue: items.reduce((sum, item) => sum + (item.stock.quantity * item.price), 0)
        };

        // Get items with stock details
        const stockItems = items.map(item => {
            const bundleQuantity = item.bundleInfo ? parseFloat(item.bundleInfo.match(/(\d+\.?\d*)/)?.[1] || 0) : 0;
            
            return {
                ...item,
                stockStatus: item.stock.quantity === 0 ? 'out-of-stock' : 
                           item.stock.quantity <= item.stock.minLevel ? 'low-stock' : 'in-stock',
                stockValue: item.stock.quantity * item.price,
                bundleQuantity: bundleQuantity,
                totalBundles: bundleQuantity > 0 ? Math.floor(item.stock.quantity / bundleQuantity) : 0
            };
        });

        res.render('stock/index', {
            title: `Stock Management - ${res.locals.companyName}`,
            user: req.session.user,
            stockStats: stockStats,
            stockItems: stockItems,
            query: req.query,
            timestamp: Date.now(), // Force browser refresh
            debugInfo: `Filtered ${items.length} items from ${allItems.length} total`
        });
    } catch (error) {
        console.error('Error loading stock:', error);
        res.status(500).render('error', { 
            message: 'Failed to load stock data',
            user: req.session.user 
        });
    }
});

// GET /stock/adjust/:id - Stock adjustment form
router.get('/adjust/:id', requireAuth, (req, res) => {
    try {
        console.log(`🔧 Loading stock adjustment form for item: ${req.params.id}`);
        
        const item = dataManager.findById('items', req.params.id);
        if (!item) {
            return res.status(404).render('error', { 
                message: 'Item not found',
                user: req.session.user 
            });
        }

        console.log(`📦 Current stock for ${item.name}: ${item.stock.quantity} ${item.unit}`);

        // Check if item is a service item
        if (item.isServiceItem) {
            return res.redirect('/stock?error=Cannot adjust stock for service items');
        }

        res.render('stock/adjust', {
            title: `Adjust Stock - ${item.name} - ${res.locals.companyName}`,
            user: req.session.user,
            item: item,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading item:', error);
        res.status(500).render('error', { 
            message: 'Failed to load item data',
            user: req.session.user 
        });
    }
});

// POST /stock/adjust/:id - Process stock adjustment
router.post('/adjust/:id', requireAuth, (req, res) => {
    try {
        const { adjustmentType, quantity, reason } = req.body;
        const adjustmentQty = parseFloat(quantity);

        console.log(`🔧 Processing stock adjustment: ${adjustmentType} ${adjustmentQty} for item ${req.params.id}`);

        if (!adjustmentType || !adjustmentQty || !reason) {
            return res.redirect(`/stock/adjust/${req.params.id}?error=All fields are required`);
        }

        const item = dataManager.findById('items', req.params.id);
        if (!item) {
            return res.redirect('/stock?error=Item not found');
        }

        console.log(`📦 Original stock for ${item.name}: ${item.stock.quantity} ${item.unit}`);

        // Check if item is a service item
        if (item.isServiceItem) {
            return res.redirect('/stock?error=Cannot adjust stock for service items');
        }

        // Calculate new stock
        let newStock = item.stock.quantity;
        if (adjustmentType === 'add') {
            newStock += adjustmentQty;
        } else if (adjustmentType === 'subtract') {
            newStock = Math.max(0, newStock - adjustmentQty);
        } else if (adjustmentType === 'set') {
            newStock = adjustmentQty;
        }

        console.log(`📦 New stock calculated: ${newStock} ${item.unit}`);

        // Prepare update data
        const updateData = {
            'stock.quantity': newStock,
            lastStockUpdate: new Date().toISOString(),
            lastStockAdjustment: {
                type: adjustmentType,
                quantity: adjustmentQty,
                reason: reason,
                oldStock: item.stock.quantity,
                newStock: newStock,
                adjustedBy: req.session.user.id,
                adjustedAt: new Date().toISOString()
            }
        };

        // Update stock using file system operations
        const success = dataManager.updateNestedProperty('items', req.params.id, 'stock.quantity', newStock);
        
        if (success) {
            // Update the additional fields
            dataManager.updateById('items', req.params.id, {
                lastStockUpdate: updateData.lastStockUpdate,
                lastStockAdjustment: updateData.lastStockAdjustment
            });
            
            console.log(`✅ Stock adjusted: ${item.name} from ${item.stock.quantity} to ${newStock}`);
            res.redirect(`/stock?success=Stock adjusted successfully for ${item.name}&timestamp=${Date.now()}`);
        } else {
            console.error('❌ Failed to update stock in file system');
            res.redirect(`/stock/adjust/${req.params.id}?error=Failed to adjust stock&timestamp=${Date.now()}`);
        }
    } catch (error) {
        console.error('Error adjusting stock:', error);
        res.redirect(`/stock/adjust/${req.params.id}?error=Failed to adjust stock&timestamp=${Date.now()}`);
    }
});

// GET /stock/movements - Stock movement history
router.get('/movements', requireAuth, (req, res) => {
    try {
        const allItems = dataManager.getAll('items');
        const bills = dataManager.getAll('bills');
        
        // Filter out service items and inactive items - only track active physical inventory movements
        const items = allItems.filter(item => !item.isServiceItem && item.isActive === true);
        
        // Get stock movements from bills (sales) - only for physical items
        const salesMovements = [];
        bills.forEach(bill => {
            bill.items.forEach(billItem => {
                const item = items.find(i => i.id === billItem.itemId);
                if (item && !item.isServiceItem) {
                    salesMovements.push({
                        type: 'sale',
                        itemName: item.name,
                        itemId: item.id,
                        quantity: billItem.quantity,
                        reference: `Bill #${bill.billNumber}`,
                        date: bill.billDate,
                        user: bill.createdBy
                    });
                }
            });
        });

        // Get stock adjustments - only for active physical items
        const adjustmentMovements = items
            .filter(item => item.lastStockAdjustment && !item.isServiceItem && item.isActive === true)
            .map(item => ({
                type: 'adjustment',
                itemName: item.name,
                itemId: item.id,
                quantity: item.lastStockAdjustment.quantity,
                adjustmentType: item.lastStockAdjustment.type,
                reason: item.lastStockAdjustment.reason,
                oldStock: item.lastStockAdjustment.oldStock,
                newStock: item.lastStockAdjustment.newStock,
                reference: item.lastStockAdjustment.reason,
                date: item.lastStockAdjustment.adjustedAt,
                user: item.lastStockAdjustment.adjustedBy
            }));

        // Combine and sort movements
        const allMovements = [...salesMovements, ...adjustmentMovements]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.render('stock/movements', {
            title: `Stock Movements - ${res.locals.companyName}`,
            user: req.session.user,
            movements: allMovements,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading stock movements:', error);
        res.status(500).render('error', { 
            message: 'Failed to load stock movements',
            user: req.session.user 
        });
    }
});

// API endpoint to get current stock for an item
router.get('/api/item/:id', requireAuth, (req, res) => {
    try {
        const item = dataManager.findById('items', req.params.id);
        if (!item) {
            return res.status(404).json({ error: 'Item not found' });
        }

        res.json({
            id: item.id,
            name: item.name,
            currentStock: item.stock.quantity,
            minLevel: item.stock.minLevel,
            unit: item.unit,
            bundleInfo: item.bundleInfo
        });
    } catch (error) {
        console.error('Error getting item stock:', error);
        res.status(500).json({ error: 'Failed to get item stock' });
    }
});

// Debug endpoint to check filtering logic
router.get('/debug/items', requireAuth, (req, res) => {
    try {
        const allItems = dataManager.getAll('items');
        
        const analysis = {
            totalItems: allItems.length,
            itemsWithNames: allItems.map(item => ({
                id: item.id,
                name: item.name,
                isActive: item.isActive,
                isServiceItem: item.isServiceItem,
                shouldShow: !item.isServiceItem && item.isActive === true
            })),
            filteredItems: allItems.filter(item => !item.isServiceItem && item.isActive === true).length,
            steel20mmStatus: allItems.find(item => item.name.includes('20mm'))
        };
        
        res.json(analysis);
    } catch (error) {
        console.error('Error in debug endpoint:', error);
        res.status(500).json({ error: 'Debug failed' });
    }
});

module.exports = router;
