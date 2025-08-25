const express = require('express');
const router = express.Router();
const path = require('path');
const dataManager = require('../utils/dataManager');
// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// GET /billing - Bills list page
router.get('/', requireAuth, (req, res) => {
    try {
        const billsData = dataManager.getBillsData();
        const bills = billsData.bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const customers = dataManager.findBy('customers', { isActive: true });
        
        // Add customer names to bills
        const billsWithCustomers = bills.map(bill => {
            const customer = customers.find(cust => cust.id === bill.customerId);
            return {
                ...bill,
                customerName: customer ? customer.name : 'Unknown Customer'
            };
        });

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todaysBills = bills.filter(bill => bill.createdAt.split('T')[0] === today);
        const totalToday = todaysBills.reduce((sum, bill) => sum + bill.grandTotal, 0);
        const pendingBills = bills.filter(bill => bill.status === 'pending').length;

        res.render('billing/index', {
            title: `Billing & Invoices - ${res.locals.companyName}`,
            user: req.session.user,
            bills: billsWithCustomers,
            totalBills: bills.length,
            todaysRevenue: totalToday,
            pendingBills: pendingBills,
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

// GET /billing/new - Create new bill form
router.get('/new', requireAuth, (req, res) => {
    try {
        const customers = dataManager.findBy('customers', { isActive: true });
        const items = dataManager.findBy('items', { isActive: true });
        const company = dataManager.getAll('company');
        const nextBillNumber = dataManager.getAll('nextBillNumber') || 1;
        
        res.render('billing/form', {
            title: `Create New Bill - ${res.locals.companyName}`,
            user: req.session.user,
            customers: customers,
            items: items,
            company: company,
            nextBillNumber: nextBillNumber,
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

// GET /billing/:id - View bill details
router.get('/:id', requireAuth, (req, res) => {
    try {
        const bill = dataManager.findBy('bills', { id: req.params.id  })[0];
        const customers = dataManager.findBy('customers', { isActive: true });
        const company = dataManager.getAll('company');
        
        if (!bill) {
            return res.status(404).render('error', { 
                message: 'Bill not found',
                user: req.session.user 
            });
        }

        const customer = customers.find(cust => cust.id === bill.customerId);

        res.render('billing/view', {
            title: `Bill ${bill.billNumber} - ${res.locals.companyName}`,
            user: req.session.user,
            bill: bill,
            customer: customer,
            company: company
        });
    } catch (error) {
        console.error('Error loading bill:', error);
        res.status(500).render('error', { 
            message: 'Error loading bill',
            user: req.session.user 
        });
    }
});

// POST /billing - Create new bill
router.post('/', requireAuth, (req, res) => {
    try {
        const { customerId, billDate, items: billItems } = req.body;
        
        // Validation
        if (!customerId || !billDate || !billItems || billItems.length === 0) {
            return res.redirect('/billing/new?error=Please fill all required fields and add items');
        }

        // Get customer and validate credit limit for credit customers
        const customer = dataManager.findBy('customers', { id: customerId  })[0];
        if (!customer) {
            return res.redirect('/billing/new?error=Customer not found');
        }

        // Parse and validate items
        let totalAmount = 0;
        let totalGst = 0;
        const validatedItems = [];

        for (let billItem of billItems) {
            const item = dataManager.findBy('items', { id: billItem.itemId  })[0];
            if (!item) continue;

            const quantity = parseFloat(billItem.quantity) || 0;
            const price = billItem.priceOverride || item.price;
            const lineTotal = quantity * price;

            // Calculate GST
            let gstAmount = 0;
            if (item.isTaxable && customer.gst.isRegistered) {
                gstAmount = (lineTotal * item.gstRate) / 100;
            }

            validatedItems.push({
                itemId: item.id,
                itemName: item.name,
                unit: item.unit,
                quantity: quantity,
                rate: price,
                lineTotal: lineTotal,
                gstRate: item.isTaxable ? item.gstRate : 0,
                gstAmount: gstAmount,
                hsnCode: item.hsnCode
            });

            totalAmount += lineTotal;
            totalGst += gstAmount;

            // Update stock for non-service items
            if (!item.isServiceItem) {
                const newQuantity = item.stock.quantity - quantity;
                dataManager.updateNestedProperty('items', item.id, 'stock.quantity', newQuantity);
            }
        }

        const grandTotal = totalAmount + totalGst;

        // Check credit limit for credit customers
        if (customer.paymentTerms !== 'Cash') {
            const newOutstanding = customer.outstandingAmount + grandTotal;
            if (newOutstanding > customer.creditLimit) {
                return res.redirect('/billing/new?error=Credit limit exceeded. Outstanding would be ₹' + newOutstanding.toLocaleString() + ', Limit: ₹' + customer.creditLimit.toLocaleString());
            }
        }

        // Generate bill ID using the same system as bills.js
        const billId = dataManager.generateNextBillId(false); // Assuming non-GST for legacy billing
        if (!billId) {
            return res.redirect('/billing/new?error=Failed to generate bill number. Please try again.');
        }

        // Create bill object
        const newBill = {
            id: billId,
            billNumber: billId,
            customerId: customer.id,
            billDate: billDate,
            items: validatedItems,
            subtotal: totalAmount,
            totalGst: totalGst,
            grandTotal: grandTotal,
            status: customer.paymentTerms === 'Cash' ? 'paid' : 'pending',
            paymentTerms: customer.paymentTerms,
            createdBy: req.session.user.id,
            createdAt: new Date().toISOString(),
            dueDate: customer.paymentTerms === 'Cash' ? null : calculateDueDate(billDate, customer.paymentTerms)
        };

        // Save bill
        dataManager.add('bills', newBill);

        // Update customer outstanding and total purchases
        if (customer.paymentTerms !== 'Cash') {
            dataManager.updateById('customers', customer.id, {
                outstandingAmount: customer.outstandingAmount + grandTotal,
                totalPurchases: (customer.totalPurchases || 0) + grandTotal
            });
        } else {
            dataManager.updateById('customers', customer.id, {
                totalPurchases: (customer.totalPurchases || 0) + grandTotal
            });
        }

        res.redirect(`/billing/${newBill.id}?success=Bill created successfully`);
    } catch (error) {
        console.error('Error creating bill:', error);
        res.redirect('/billing/new?error=Error creating bill');
    }
});

// POST /billing/:id/payment - Record payment
router.post('/:id/payment', requireAuth, (req, res) => {
    try {
        const { paymentAmount } = req.body;
        const bill = dataManager.findBy('bills', { id: req.params.id  })[0];
        
        if (!bill) {
            return res.redirect('/billing?error=Bill not found');
        }

        const payment = parseFloat(paymentAmount) || 0;
        if (payment <= 0) {
            return res.redirect(`/billing/${bill.id}?error=Invalid payment amount`);
        }

        // Update bill status
        if (payment >= bill.grandTotal) {
            dataManager.updateById('bills', bill.id, { 
                status: 'paid',
                paidDate: new Date().toISOString(),
                paidAmount: payment
            });
        }

        // Update customer outstanding
        const customer = dataManager.findBy('customers', { id: bill.customerId  })[0];
        if (customer) {
            const newOutstanding = Math.max(0, customer.outstandingAmount - payment);
            dataManager.updateById('customers', customer.id, {
                outstandingAmount: newOutstanding
            });
        }

        res.redirect(`/billing/${bill.id}?success=Payment recorded successfully`);
    } catch (error) {
        console.error('Error recording payment:', error);
        res.redirect(`/billing/${req.params.id}?error=Error recording payment`);
    }
});

// Helper function to calculate due date
function calculateDueDate(billDate, paymentTerms) {
    const date = new Date(billDate);
    if (paymentTerms.includes('7 days')) {
        date.setDate(date.getDate() + 7);
    } else if (paymentTerms.includes('15 days')) {
        date.setDate(date.getDate() + 15);
    } else if (paymentTerms.includes('30 days')) {
        date.setDate(date.getDate() + 30);
    } else if (paymentTerms.includes('45 days')) {
        date.setDate(date.getDate() + 45);
    }
    return date.toISOString();
}

module.exports = router;
