const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const path = require('path');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// GET /bills - Bills list page
router.get('/', requireAuth, (req, res) => {
    try {
        const bills = dataManager.getAll('bills').sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
        const totalBills = bills.length;
        const todaysBills = bills.filter(bill => {
            const billDate = new Date(bill.billDate).toDateString();
            const today = new Date().toDateString();
            return billDate === today;
        }).length;
        
        const totalAmount = bills.reduce((sum, bill) => sum + bill.finalTotal, 0);
        const todaysAmount = bills.filter(bill => {
            const billDate = new Date(bill.billDate).toDateString();
            const today = new Date().toDateString();
            return billDate === today;
        }).reduce((sum, bill) => sum + bill.finalTotal, 0);

        res.render('bills/index', {
            title: 'Billing System - Vikram Steels',
            user: req.session.user,
            bills: bills,
            totalBills: totalBills,
            todaysBills: todaysBills,
            totalAmount: totalAmount,
            todaysAmount: todaysAmount,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading bills:', error);
        res.status(500).render('error', { 
            message: 'Error loading bills',
            user: req.session.user 
        });
    }
});

// API endpoint to get fresh stock data
router.get('/api/fresh-stock', requireAuth, (req, res) => {
    try {
        const items = dataManager.findBy('items', { isActive: true });
        const stockData = {};
        
        items.forEach(item => {
            stockData[item.id] = {
                quantity: item.stock?.quantity || 0,
                minLevel: item.stock?.minLevel || 0
            };
        });
        
        res.json(stockData);
    } catch (error) {
        console.error('Error fetching fresh stock:', error);
        res.status(500).json({ error: 'Failed to fetch stock data' });
    }
});

// GET /bills/new - Create new bill form
router.get('/new', requireAuth, (req, res) => {
    try {
        // Always fetch fresh data from database
        const customers = dataManager.findBy('customers', { isActive: true });
        const items = dataManager.findBy('items', { isActive: true });
        const categories = dataManager.findBy('categories', { isActive: true });
        const company = dataManager.getCompanyData();
        const billsData = dataManager.getBillsData();
        const nextBillNumber = billsData.nextBillNumber;

        // Add category names to items and ensure fresh stock data
        const itemsWithCategories = items.map(item => {
            const category = categories.find(cat => cat.id === item.categoryId);
            return {
                ...item,
                categoryName: category ? category.name : 'Unknown',
                // Ensure stock is fresh from database with null checking
                stock: {
                    quantity: item.stock?.quantity || 0,
                    minLevel: item.stock?.minLevel || 0
                }
            };
        });

        res.render('bills/form', {
            title: 'New Bill - Vikram Steels',
            user: req.session.user,
            customers: customers,
            items: itemsWithCategories,
            company: company,
            billNumber: nextBillNumber,
            isEdit: false,
            bill: null
        });
    } catch (error) {
        console.error('Error loading new bill form:', error);
        res.status(500).render('error', { 
            message: 'Error loading form',
            user: req.session.user 
        });
    }
});

// POST /bills - Create new bill
router.post('/', requireAuth, (req, res) => {
    try {
        const { 
            customerType, customerId, customerName, customerPhone, customerGstin,
            billItems, extraCharges, subtotal, cgstAmount, sgstAmount, finalTotal,
            paymentMethod, upiTransactionId, bankReference, bankName,
            chequeNumber, chequeBankName, chequeDate, cardLast4, cardType,
            creditDueDate, creditTerms
        } = req.body;

        // Validate required fields
        if (!customerType) {
            return res.redirect('/bills/new?error=Customer type is required');
        }

        if (!billItems || billItems === '[]') {
            return res.redirect('/bills/new?error=Please add at least one item to the bill');
        }

        if (!subtotal || !finalTotal) {
            return res.redirect('/bills/new?error=Invalid bill totals. Please recalculate.');
        }

        let customer;

        // Handle customer creation/selection with validation
        if (customerType === 'existing') {
            if (!customerId) {
                return res.redirect('/bills/new?error=Please select a customer from the list');
            }
            customer = dataManager.findBy('customers', { id: customerId  })[0];
            if (!customer) {
                return res.redirect('/bills/new?error=Selected customer not found');
            }
        } else if (customerType === 'new') {
            // Validate new customer fields
            if (!customerName || !customerName.trim()) {
                return res.redirect('/bills/new?error=Customer name is required for new customer');
            }
            if (!customerPhone || !customerPhone.trim()) {
                return res.redirect('/bills/new?error=Customer phone number is required for new customer');
            }

            // Validate phone number format (basic validation)
            const phoneRegex = /^[\+]?[0-9\-\s]{10,15}$/;
            if (!phoneRegex.test(customerPhone.trim())) {
                return res.redirect('/bills/new?error=Please enter a valid phone number (10-15 digits)');
            }

            // Check if customer already exists by phone number (primary unique identifier)
            const customers = dataManager.getAll('customers');
            const existingCustomer = customers.find(c => 
                c.contact?.phone === customerPhone.trim()
            );

            if (existingCustomer) {
                // Customer already exists, use existing customer
                customer = existingCustomer;
                console.log(`📋 Using existing customer for bill: ${customerName} (${existingCustomer.id}) - matched by phone`);
            } else {
                // Create new customer only if doesn't exist
                const nextId = customers.length + 1;
                const newCustomerId = `cust_${String(nextId).padStart(3, '0')}`;

                customer = {
                    id: newCustomerId,
                    name: customerName.trim(),
                    type: 'Individual',
                    contact: {
                        phone: customerPhone.trim(),
                        email: '',
                        address: {
                            line1: '',
                            line2: '',
                            city: '',
                            state: '',
                            pincode: ''
                        }
                    },
                    gst: {
                        gstin: customerGstin ? customerGstin.trim().toUpperCase() : '',
                        isRegistered: customerGstin ? true : false
                    },
                    paymentTerms: 'Cash',
                    creditLimit: 0,
                    totalPurchases: 0,
                    outstandingAmount: 0,
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdFrom: 'bill' // Track that this customer came from bill
                };

                // Add to database
                dataManager.add('customers', customer);
                console.log(`✅ New customer created from bill: ${customerName} (${newCustomerId})`);
            }
        } else {
            return res.redirect('/bills/new?error=Invalid customer type. Please select Existing or New Customer.');
        }

        // Final customer validation
        if (!customer || !customer.id) {
            return res.redirect('/bills/new?error=Failed to process customer information. Please try again.');
        }

        // Generate bill number
        const billsData = dataManager.getBillsData();
        const billNumber = billsData.nextBillNumber;
        const billId = `bill_${String(billNumber).padStart(3, '0')}`;

        // Parse bill items and charges
        const parsedItems = JSON.parse(billItems);
        const parsedCharges = extraCharges ? JSON.parse(extraCharges) : [];

        // Validate stock availability for physical items
        for (const item of parsedItems) {
            if (!item.isServiceItem) {
                const currentItem = dataManager.findBy('items', { id: item.itemId  })[0];
                if (!currentItem) {
                    return res.redirect(`/bills/new?error=Item not found: ${item.itemName}`);
                }
                
                const availableStock = currentItem.stock?.quantity || 0;
                if (availableStock < item.quantity) {
                    return res.redirect(`/bills/new?error=Insufficient stock for ${item.itemName}. Available: ${availableStock} ${currentItem.unit}, Required: ${item.quantity} ${currentItem.unit}`);
                }
            }
        }

        // Create payment details object based on payment method
        const paymentDetails = {
            method: paymentMethod || 'Cash'
        };

        // Add optional payment details if provided
        if (paymentMethod === 'UPI' && upiTransactionId) {
            paymentDetails.transactionId = upiTransactionId.trim();
        } else if (paymentMethod === 'Bank Transfer') {
            if (bankReference) paymentDetails.referenceNumber = bankReference.trim();
            if (bankName) paymentDetails.bankName = bankName.trim();
        } else if (paymentMethod === 'Cheque') {
            if (chequeNumber) paymentDetails.chequeNumber = chequeNumber.trim();
            if (chequeBankName) paymentDetails.bankName = chequeBankName.trim();
            if (chequeDate) paymentDetails.chequeDate = chequeDate;
        } else if (paymentMethod === 'Card') {
            if (cardLast4) paymentDetails.last4Digits = cardLast4.trim();
            if (cardType) paymentDetails.cardType = cardType;
        } else if (paymentMethod === 'Credit') {
            if (creditDueDate) paymentDetails.dueDate = creditDueDate;
            if (creditTerms) paymentDetails.terms = creditTerms.trim();
        }

        // Create bill object matching the sample invoice format
        const newBill = {
            id: billId,
            billNumber: billNumber,
            customerId: customer.id,
            customerName: customer.name,
            customerPhone: customer.contact.phone,
            customerGstin: customer.gst.gstin,
            billDate: new Date().toISOString(),
            items: parsedItems,
            extraCharges: parsedCharges,
            subtotal: parseFloat(subtotal),
            cgstAmount: parseFloat(cgstAmount),
            sgstAmount: parseFloat(sgstAmount),
            totalGst: parseFloat(cgstAmount) + parseFloat(sgstAmount),
            finalTotal: parseFloat(finalTotal),
            paymentMethod: paymentDetails.method,
            paymentDetails: paymentDetails,
            createdBy: req.session.user.id,
            createdAt: new Date().toISOString()
        };

        // Add bill to database
        dataManager.add('bills', newBill);

        // Update bill number
        dataManager.updateNextBillNumber(billNumber + 1);

        // Update customer total purchases
        dataManager.updateById('customers', customer.id, {
            totalPurchases: (customer.totalPurchases || 0) + parseFloat(finalTotal)
        });

        // Update item stock quantities (only for physical items, not services)
        parsedItems.forEach(item => {
            if (!item.isServiceItem) {
                const currentItem = dataManager.findBy('items', { id: item.itemId })[0];
                if (currentItem) {
                    const currentStock = currentItem.stock?.quantity || 0;
                    const newQuantity = Math.max(0, currentStock - item.quantity);
                    
                    // Update stock using dataManager
                    dataManager.updateNestedProperty('items', item.itemId, 'stock.quantity', newQuantity);
                    dataManager.updateById('items', item.itemId, {
                        lastStockUpdate: new Date().toISOString(),
                        lastStockMovement: {
                            type: 'sale',
                            quantity: item.quantity,
                            billId: billId,
                            soldAt: new Date().toISOString()
                        }
                    });
                        
                    console.log(`Stock deducted: ${currentItem.name} - ${item.quantity} (${currentStock} → ${newQuantity})`);
                }
            }
        });

        res.redirect(`/bills/${billId}?success=Bill created successfully`);
    } catch (error) {
        console.error('Error creating bill:', error);
        res.redirect('/bills/new?error=Error creating bill');
    }
});

// GET /bills/:id - View specific bill
router.get('/:id', requireAuth, (req, res) => {
    try {
        const bill = dataManager.findBy('bills', { id: req.params.id  })[0];
        if (!bill) {
            return res.status(404).render('error', { 
                message: 'Bill not found',
                user: req.session.user 
            });
        }

        const company = dataManager.getAll('company');
        
        res.render('bills/view', {
            title: `Bill #${bill.billNumber} - Vikram Steels`,
            user: req.session.user,
            bill: bill,
            company: company,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading bill:', error);
        res.status(500).render('error', { 
            message: 'Error loading bill',
            user: req.session.user 
        });
    }
});

// GET /bills/:id/print - Print version of bill
router.get('/:id/print', requireAuth, (req, res) => {
    try {
        const bill = dataManager.findBy('bills', { id: req.params.id  })[0];
        if (!bill) {
            return res.status(404).render('error', { 
                message: 'Bill not found',
                user: req.session.user 
            });
        }

        const company = dataManager.getAll('company');
        
        res.render('bills/print', {
            title: `Bill #${bill.billNumber} - Print`,
            user: req.session.user,
            bill: bill,
            company: company,
            layout: false // No layout for print view
        });
    } catch (error) {
        console.error('Error loading bill for print:', error);
        res.status(500).render('error', { 
            message: 'Error loading bill',
            user: req.session.user 
        });
    }
});

// POST /bills/:id/delete - Delete bill
router.post('/:id/delete', requireAuth, (req, res) => {
    try {
        const bill = dataManager.findBy('bills', { id: req.params.id  })[0];
        if (!bill) {
            return res.redirect('/bills?error=Bill not found');
        }

        // Remove bill
        dataManager.deleteById('bills', req.params.id);

        res.redirect('/bills?success=Bill deleted successfully');
    } catch (error) {
        console.error('Error deleting bill:', error);
        res.redirect('/bills?error=Error deleting bill');
    }
});

module.exports = router;
