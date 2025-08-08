const express = require('express');
const router = express.Router();
const path = require('path');

const dataManager = require('../utils/dataManager');
// Database adapters
);
);
);
);
);

// Initialize databases
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
        const bills = billsDb.get('bills').orderBy(['billDate'], ['desc']).value();
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
            title: `Billing System - ${res.locals.companyName}`,
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

// GET /bills/new - Create new bill form
router.get('/new', requireAuth, (req, res) => {
    try {
        const items = dataManager.findBy('items', { isActive: true });
        const customers = dataManager.findBy('customers', { isActive: true });
        const company = dataManager.getAll('company');
        const nextBillNumber = dataManager.getAll('nextBillNumber');

        res.render('bills/form', {
            title: `New Bill - ${res.locals.companyName}`,
            user: req.session.user,
            items: items,
            customers: customers,
            company: company,
            billNumber: nextBillNumber,
            bill: null,
            isEdit: false
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
            customerType, 
            customerId, 
            newCustomerName, 
            newCustomerPhone, 
            newCustomerGstin,
            items: billItems,
            subtotal,
            cgst,
            sgst,
            totalAmount,
            paymentReceived,
            notes
        } = req.body;

        let finalCustomerId = customerId;

        // Create new customer if needed
        if (customerType === 'new') {
            if (!newCustomerName || !newCustomerPhone) {
                return res.redirect('/bills/new?error=Customer name and phone are required');
            }

            // Generate new customer ID
            const customers = dataManager.getAll('customers');
            const nextId = customers.length + 1;
            finalCustomerId = `cust_${String(nextId).padStart(3, '0')}`;

            // Create new customer
            const newCustomer = {
                id: finalCustomerId,
                name: newCustomerName.trim(),
                type: 'Individual',
                contact: {
                    phone: newCustomerPhone.trim(),
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
                    gstin: newCustomerGstin ? newCustomerGstin.trim().toUpperCase() : '',
                    isRegistered: newCustomerGstin ? true : false
                },
                totalPurchases: 0,
                isActive: true,
                createdAt: new Date().toISOString()
            };

            dataManager.add('customers', newCustomer);
        }

        // Validate bill items
        if (!billItems || billItems.length === 0) {
            return res.redirect('/bills/new?error=Please add at least one item to the bill');
        }

        // Generate bill number and ID
        const nextBillNumber = dataManager.getAll('nextBillNumber');
        const billId = `bill_${String(nextBillNumber).padStart(4, '0')}`;

        // Create bill object
        const newBill = {
            id: billId,
            billNumber: nextBillNumber,
            customerId: finalCustomerId,
            items: Array.isArray(billItems) ? billItems : [billItems],
            amounts: {
                subtotal: parseFloat(subtotal),
                cgst: parseFloat(cgst),
                sgst: parseFloat(sgst),
                totalAmount: parseFloat(totalAmount)
            },
            paymentReceived: parseFloat(paymentReceived),
            notes: notes || '',
            createdAt: new Date().toISOString(),
            createdBy: req.session.user.id
        };

        // Add bill to database
        dataManager.add('bills', newBill);
        billsDb.set('nextBillNumber', nextBillNumber + 1).write();

        // Update customer's total purchases
        customersDb.get('customers')
            .find({ id: finalCustomerId })
            .assign({
                totalPurchases: customersDb.get('customers')
                    .find({ id: finalCustomerId })
                    .get('totalPurchases')
                    .value() + parseFloat(totalAmount)
            })
            .write();

        // Update item stock (for non-service items)
        if (Array.isArray(billItems)) {
            billItems.forEach(item => {
                const dbItem = dataManager.findBy('items', { id: item.itemId  })[0];
                if (dbItem && !dbItem.isServiceItem) {
                    const newQuantity = dbItem.stock.quantity - parseFloat(item.quantity);
                    itemsDb.get('items')
                        .find({ id: item.itemId })
                        .assign({
                            'stock.quantity': Math.max(0, newQuantity)
                        })
                        .write();
                }
            });
        } else {
            // Single item
            const dbItem = dataManager.findBy('items', { id: billItems.itemId  })[0];
            if (dbItem && !dbItem.isServiceItem) {
                const newQuantity = dbItem.stock.quantity - parseFloat(billItems.quantity);
                itemsDb.get('items')
                    .find({ id: billItems.itemId })
                    .assign({
                        'stock.quantity': Math.max(0, newQuantity)
                    })
                    .write();
            }
        }

        res.redirect(`/bills/${billId}?success=Bill created successfully`);
    } catch (error) {
        console.error('Error creating bill:', error);
        res.redirect('/bills/new?error=Error creating bill');
    }
});

// GET /bills/:id - View bill details
router.get('/:id', requireAuth, (req, res) => {
    try {
        const bill = dataManager.findBy('bills', { id: req.params.id  })[0];
        
        if (!bill) {
            return res.status(404).render('error', { 
                message: 'Bill not found',
                user: req.session.user 
            });
        }

        const customer = dataManager.findBy('customers', { id: bill.customerId  })[0];
        const company = dataManager.getAll('company');
        const items = dataManager.getAll('items');

        // Add item details to bill items
        const billWithItemDetails = {
            ...bill,
            items: Array.isArray(bill.items) ? bill.items.map(billItem => {
                const itemDetails = items.find(item => item.id === billItem.itemId);
                return {
                    ...billItem,
                    itemName: itemDetails ? itemDetails.name : 'Unknown Item',
                    itemUnit: itemDetails ? itemDetails.unit : '',
                    itemHsnCode: itemDetails ? itemDetails.hsnCode : ''
                };
            }) : []
        };

        res.render('bills/view', {
            title: `Bill #${bill.billNumber} - ${res.locals.companyName}`,
            user: req.session.user,
            bill: billWithItemDetails,
            customer: customer,
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

module.exports = router;
