const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// GET /reports - Reports dashboard
router.get('/', requireAuth, (req, res) => {
    try {
        const billsData = dataManager.getBillsData();
        const bills = billsData.bills || [];
        const items = dataManager.getAll('items');
        const customers = dataManager.getAll('customers');
        
        // Calculate date ranges
        const today = new Date();
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const thisYear = new Date(today.getFullYear(), 0, 1);
        
        // Filter bills by date ranges
        const todaysBills = bills.filter(bill => {
            const billDate = new Date(bill.createdAt || bill.billDate);
            return billDate.toDateString() === today.toDateString();
        });
        
        const thisMonthBills = bills.filter(bill => {
            const billDate = new Date(bill.createdAt || bill.billDate);
            return billDate >= thisMonth;
        });
        
        const lastMonthBills = bills.filter(bill => {
            const billDate = new Date(bill.createdAt || bill.billDate);
            return billDate >= lastMonth && billDate < thisMonth;
        });
        
        const thisYearBills = bills.filter(bill => {
            const billDate = new Date(bill.createdAt || bill.billDate);
            return billDate >= thisYear;
        });
        
        // Calculate revenue metrics
        const todaysRevenue = todaysBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        const thisMonthRevenue = thisMonthBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        const lastMonthRevenue = lastMonthBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        const thisYearRevenue = thisYearBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        
        // Calculate GST summary
        const gstCollected = bills.reduce((sum, bill) => {
            return sum + (bill.totalGst || bill.cgstAmount + bill.sgstAmount || 0);
        }, 0);
        
        const thisMonthGst = thisMonthBills.reduce((sum, bill) => {
            return sum + (bill.totalGst || bill.cgstAmount + bill.sgstAmount || 0);
        }, 0);
        
        // Top selling items analysis
        const itemSales = {};
        bills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    if (!itemSales[item.itemId]) {
                        itemSales[item.itemId] = {
                            itemId: item.itemId,
                            itemName: item.itemName || item.name,
                            totalQuantity: 0,
                            totalRevenue: 0,
                            transactionCount: 0
                        };
                    }
                    itemSales[item.itemId].totalQuantity += item.quantity || 0;
                    itemSales[item.itemId].totalRevenue += item.amount || (item.quantity * item.rate) || 0;
                    itemSales[item.itemId].transactionCount += 1;
                });
            }
        });
        
        const topItems = Object.values(itemSales)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 10);
        
        // Customer analysis
        const customerAnalysis = {};
        bills.forEach(bill => {
            if (!customerAnalysis[bill.customerId]) {
                customerAnalysis[bill.customerId] = {
                    customerId: bill.customerId,
                    customerName: bill.customerName,
                    totalBills: 0,
                    totalRevenue: 0,
                    lastPurchase: null
                };
            }
            customerAnalysis[bill.customerId].totalBills += 1;
            customerAnalysis[bill.customerId].totalRevenue += bill.finalTotal || bill.grandTotal || 0;
            
            const billDate = new Date(bill.createdAt || bill.billDate);
            if (!customerAnalysis[bill.customerId].lastPurchase || billDate > new Date(customerAnalysis[bill.customerId].lastPurchase)) {
                customerAnalysis[bill.customerId].lastPurchase = bill.createdAt || bill.billDate;
            }
        });
        
        const topCustomers = Object.values(customerAnalysis)
            .sort((a, b) => b.totalRevenue - a.totalRevenue)
            .slice(0, 10);
        
        // Monthly trends (last 6 months)
        const monthlyTrends = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            
            const monthBills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt || bill.billDate);
                return billDate >= monthStart && billDate <= monthEnd;
            });
            
            const monthRevenue = monthBills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
            const monthGst = monthBills.reduce((sum, bill) => sum + (bill.totalGst || bill.cgstAmount + bill.sgstAmount || 0), 0);
            
            monthlyTrends.push({
                month: monthStart.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
                revenue: monthRevenue,
                gst: monthGst,
                billCount: monthBills.length
            });
        }
        
        // Stock analysis
        const lowStockItems = items.filter(item => {
            return item.isActive !== false && !item.isServiceItem && 
                   item.stock && item.stock.quantity <= item.stock.minLevel;
        });
        
        const outOfStockItems = items.filter(item => {
            return item.isActive !== false && !item.isServiceItem && 
                   item.stock && item.stock.quantity === 0;
        });
        
        // Growth comparison
        const growthRate = lastMonthRevenue > 0 ? 
            ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
        
        const reportsData = {
            summary: {
                todaysRevenue,
                thisMonthRevenue,
                lastMonthRevenue,
                thisYearRevenue,
                todaysBills: todaysBills.length,
                thisMonthBills: thisMonthBills.length,
                totalBills: bills.length,
                totalCustomers: customers.filter(c => c.isActive !== false).length,
                growthRate: growthRate.toFixed(1)
            },
            gst: {
                totalCollected: gstCollected,
                thisMonth: thisMonthGst,
                cgstTotal: bills.reduce((sum, bill) => sum + (bill.cgstAmount || 0), 0),
                sgstTotal: bills.reduce((sum, bill) => sum + (bill.sgstAmount || 0), 0)
            },
            topItems,
            topCustomers,
            monthlyTrends,
            stock: {
                lowStock: lowStockItems,
                outOfStock: outOfStockItems,
                totalItems: items.filter(item => item.isActive !== false).length
            }
        };
        
        res.render('reports/index', {
            title: `Reports & Analytics - ${res.locals.companyName}`,
            user: req.session.user,
            reports: reportsData,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading reports:', error);
        res.status(500).render('error', { 
            message: 'Error loading reports',
            user: req.session.user 
        });
    }
});

// GET /reports/sales - Detailed sales report
router.get('/sales', requireAuth, (req, res) => {
    try {
        const { dateFrom, dateTo, customerId, itemId } = req.query;
        
        const billsData = dataManager.getBillsData();
        let bills = billsData.bills || [];
        const customers = dataManager.getAll('customers');
        const items = dataManager.getAll('items');
        
        // Apply filters
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            bills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt || bill.billDate);
                return billDate >= fromDate;
            });
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            bills = bills.filter(bill => {
                const billDate = new Date(bill.createdAt || bill.billDate);
                return billDate <= toDate;
            });
        }
        
        if (customerId) {
            bills = bills.filter(bill => bill.customerId === customerId);
        }
        
        // Calculate summary
        const totalRevenue = bills.reduce((sum, bill) => sum + (bill.finalTotal || bill.grandTotal || 0), 0);
        const totalGst = bills.reduce((sum, bill) => sum + (bill.totalGst || bill.cgstAmount + bill.sgstAmount || 0), 0);
        const totalBills = bills.length;
        
        // Add customer and item details to bills
        const detailedBills = bills.map(bill => {
            const customer = customers.find(c => c.id === bill.customerId);
            return {
                ...bill,
                customerName: customer ? customer.name : 'Unknown',
                customerPhone: customer ? customer.contact.phone : '',
                customerGstin: customer ? customer.gst.gstin : ''
            };
        });
        
        res.render('reports/sales', {
            title: `Sales Report - ${res.locals.companyName}`,
            user: req.session.user,
            bills: detailedBills,
            customers,
            items: items.filter(item => item.isActive !== false),
            summary: {
                totalRevenue,
                totalGst,
                totalBills,
                averageOrderValue: totalBills > 0 ? (totalRevenue / totalBills) : 0
            },
            filters: { dateFrom, dateTo, customerId, itemId },
            query: req.query
        });
    } catch (error) {
        console.error('Error loading sales report:', error);
        res.status(500).render('error', { 
            message: 'Error loading sales report',
            user: req.session.user 
        });
    }
});

// GET /reports/gst - GST report
router.get('/gst', requireAuth, (req, res) => {
    try {
        const { month, year } = req.query;
        const currentDate = new Date();
        const reportMonth = parseInt(month) || currentDate.getMonth() + 1;
        const reportYear = parseInt(year) || currentDate.getFullYear();
        
        const billsData = dataManager.getBillsData();
        const bills = billsData.bills || [];
        const company = dataManager.getAll('company');
        
        // Filter bills for the selected month/year
        const monthlyBills = bills.filter(bill => {
            const billDate = new Date(bill.createdAt || bill.billDate);
            return billDate.getMonth() + 1 === reportMonth && billDate.getFullYear() === reportYear;
        });
        
        // Group by GST rates
        const gstBreakdown = {};
        let totalTaxableValue = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        
        monthlyBills.forEach(bill => {
            if (bill.items && Array.isArray(bill.items)) {
                bill.items.forEach(item => {
                    const gstRate = item.gstRate || 0;
                    const taxableAmount = item.amount || (item.quantity * item.rate) || 0;
                    const cgst = taxableAmount * (gstRate / 2) / 100;
                    const sgst = taxableAmount * (gstRate / 2) / 100;
                    
                    if (!gstBreakdown[gstRate]) {
                        gstBreakdown[gstRate] = {
                            gstRate,
                            taxableValue: 0,
                            cgstAmount: 0,
                            sgstAmount: 0,
                            totalGst: 0,
                            billCount: 0
                        };
                    }
                    
                    gstBreakdown[gstRate].taxableValue += taxableAmount;
                    gstBreakdown[gstRate].cgstAmount += cgst;
                    gstBreakdown[gstRate].sgstAmount += sgst;
                    gstBreakdown[gstRate].totalGst += cgst + sgst;
                    
                    totalTaxableValue += taxableAmount;
                    totalCgst += cgst;
                    totalSgst += sgst;
                });
            }
        });
        
        // Convert to array and sort by GST rate
        const gstSummary = Object.values(gstBreakdown).sort((a, b) => a.gstRate - b.gstRate);
        
        // Generate month options for dropdown
        const monthOptions = [];
        for (let i = 1; i <= 12; i++) {
            const monthName = new Date(2025, i - 1, 1).toLocaleDateString('en-IN', { month: 'long' });
            monthOptions.push({ value: i, name: monthName, selected: i === reportMonth });
        }
        
        res.render('reports/gst', {
            title: `GST Report - ${res.locals.companyName}`,
            user: req.session.user,
            gstSummary,
            monthlyBills,
            monthOptions,
            reportMonth,
            reportYear,
            company,
            totals: {
                taxableValue: totalTaxableValue,
                cgstAmount: totalCgst,
                sgstAmount: totalSgst,
                totalGst: totalCgst + totalSgst,
                billCount: monthlyBills.length
            },
            query: req.query
        });
    } catch (error) {
        console.error('Error loading GST report:', error);
        res.status(500).render('error', { 
            message: 'Error loading GST report',
            user: req.session.user 
        });
    }
});

// GET /reports/inventory - Inventory report
router.get('/inventory', requireAuth, (req, res) => {
    try {
        const items = dataManager.getAll('items');
        const categories = dataManager.getAll('categories');
        const billsData = dataManager.getBillsData();
        const bills = billsData.bills || [];
        
        // Calculate item movement and valuation
        const inventoryData = items
            .filter(item => item.isActive !== false && !item.isServiceItem)
            .map(item => {
                const category = categories.find(cat => cat.id === item.categoryId);
                
                // Calculate total sold from bills
                let totalSold = 0;
                bills.forEach(bill => {
                    if (bill.items && Array.isArray(bill.items)) {
                        const soldItem = bill.items.find(billItem => billItem.itemId === item.id);
                        if (soldItem) {
                            totalSold += soldItem.quantity || 0;
                        }
                    }
                });
                
                const currentStock = item.stock ? item.stock.quantity : 0;
                const minLevel = item.stock ? item.stock.minLevel : 0;
                const stockValue = currentStock * item.price;
                
                return {
                    ...item,
                    categoryName: category ? category.name : 'Unknown',
                    totalSold,
                    currentStock,
                    minLevel,
                    stockValue,
                    stockStatus: currentStock === 0 ? 'Out of Stock' : 
                                currentStock <= minLevel ? 'Low Stock' : 'In Stock',
                    turnoverRatio: currentStock > 0 ? (totalSold / currentStock).toFixed(2) : 'N/A'
                };
            });
        
        // Sort by category and then by name
        inventoryData.sort((a, b) => {
            if (a.categoryName !== b.categoryName) {
                return a.categoryName.localeCompare(b.categoryName);
            }
            return a.name.localeCompare(b.name);
        });
        
        // Calculate summary
        const totalItems = inventoryData.length;
        const totalStockValue = inventoryData.reduce((sum, item) => sum + item.stockValue, 0);
        const lowStockItems = inventoryData.filter(item => item.stockStatus === 'Low Stock').length;
        const outOfStockItems = inventoryData.filter(item => item.stockStatus === 'Out of Stock').length;
        
        res.render('reports/inventory', {
            title: `Inventory Report - ${res.locals.companyName}`,
            user: req.session.user,
            inventory: inventoryData,
            categories,
            summary: {
                totalItems,
                totalStockValue,
                lowStockItems,
                outOfStockItems,
                inStockItems: totalItems - lowStockItems - outOfStockItems
            },
            query: req.query
        });
    } catch (error) {
        console.error('Error loading inventory report:', error);
        res.status(500).render('error', { 
            message: 'Error loading inventory report',
            user: req.session.user 
        });
    }
});

// GET /reports/customers - Customer analysis report
router.get('/customers', requireAuth, (req, res) => {
    try {
        const customers = dataManager.getAll('customers');
        const billsData = dataManager.getBillsData();
        const bills = billsData.bills || [];
        
        // Calculate customer statistics
        const customerAnalysis = customers
            .filter(customer => customer.isActive !== false)
            .map(customer => {
                const customerBills = bills.filter(bill => bill.customerId === customer.id);
                
                const totalRevenue = customerBills.reduce((sum, bill) => 
                    sum + (bill.finalTotal || bill.grandTotal || 0), 0);
                
                const totalBills = customerBills.length;
                
                const lastPurchase = customerBills.length > 0 ? 
                    Math.max(...customerBills.map(bill => new Date(bill.createdAt || bill.billDate).getTime())) : null;
                
                const averageOrderValue = totalBills > 0 ? totalRevenue / totalBills : 0;
                
                // Calculate days since last purchase
                const daysSinceLastPurchase = lastPurchase ? 
                    Math.floor((Date.now() - lastPurchase) / (1000 * 60 * 60 * 24)) : null;
                
                return {
                    ...customer,
                    totalRevenue,
                    totalBills,
                    averageOrderValue,
                    lastPurchase: lastPurchase ? new Date(lastPurchase).toISOString() : null,
                    daysSinceLastPurchase,
                    status: !lastPurchase ? 'New' : 
                           daysSinceLastPurchase > 90 ? 'Inactive' :
                           daysSinceLastPurchase > 30 ? 'At Risk' : 'Active'
                };
            });
        
        // Sort by total revenue
        customerAnalysis.sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        // Calculate summary
        const totalCustomers = customerAnalysis.length;
        const activeCustomers = customerAnalysis.filter(c => c.status === 'Active').length;
        const atRiskCustomers = customerAnalysis.filter(c => c.status === 'At Risk').length;
        const inactiveCustomers = customerAnalysis.filter(c => c.status === 'Inactive').length;
        const totalRevenue = customerAnalysis.reduce((sum, c) => sum + c.totalRevenue, 0);
        
        res.render('reports/customers', {
            title: `Customer Analysis - ${res.locals.companyName}`,
            user: req.session.user,
            customers: customerAnalysis,
            summary: {
                totalCustomers,
                activeCustomers,
                atRiskCustomers,
                inactiveCustomers,
                totalRevenue,
                averageRevenuePerCustomer: totalCustomers > 0 ? totalRevenue / totalCustomers : 0
            },
            query: req.query
        });
    } catch (error) {
        console.error('Error loading customer analysis:', error);
        res.status(500).render('error', { 
            message: 'Error loading customer analysis',
            user: req.session.user 
        });
    }
});

// GET /reports/export/csv - Export reports as CSV
router.get('/export/csv', requireAuth, (req, res) => {
    try {
        const { type, dateFrom, dateTo } = req.query;
        
        if (type === 'sales') {
            const billsData = dataManager.getBillsData();
            let bills = billsData.bills || [];
            const customers = dataManager.getAll('customers');
            
            // Apply date filters
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                bills = bills.filter(bill => {
                    const billDate = new Date(bill.createdAt || bill.billDate);
                    return billDate >= fromDate;
                });
            }
            
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setHours(23, 59, 59, 999);
                bills = bills.filter(bill => {
                    const billDate = new Date(bill.createdAt || bill.billDate);
                    return billDate <= toDate;
                });
            }
            
            // Generate CSV
            let csv = 'Bill Number,Date,Customer Name,Customer Phone,Subtotal,CGST,SGST,Total GST,Final Total,Payment Method\n';
            
            bills.forEach(bill => {
                const customer = customers.find(c => c.id === bill.customerId);
                const customerName = customer ? customer.name : 'Unknown';
                const customerPhone = customer ? customer.contact.phone : '';
                
                csv += `"${bill.billNumber}",`;
                csv += `"${new Date(bill.createdAt || bill.billDate).toLocaleDateString('en-IN')}",`;
                csv += `"${customerName}",`;
                csv += `"${customerPhone}",`;
                csv += `${bill.subtotal || 0},`;
                csv += `${bill.cgstAmount || 0},`;
                csv += `${bill.sgstAmount || 0},`;
                csv += `${(bill.totalGst || bill.cgstAmount + bill.sgstAmount || 0)},`;
                csv += `${bill.finalTotal || bill.grandTotal || 0},`;
                csv += `"${bill.paymentMethod || 'Cash'}"\n`;
            });
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="sales_report.csv"');
            res.send(csv);
        } else {
            res.status(400).send('Invalid export type');
        }
    } catch (error) {
        console.error('Error exporting CSV:', error);
        res.status(500).send('Error generating export');
    }
});

module.exports = router;
