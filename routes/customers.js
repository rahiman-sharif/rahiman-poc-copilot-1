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

// GET /customers - Customers list page
router.get('/', requireAuth, (req, res) => {
    try {
        const customers = dataManager.findBy('customers', { isActive: true });
        
        // Get all bills to calculate accurate totals
        const billsData = dataManager.getBillsData();
        const bills = billsData.bills || [];
        
        // Calculate actual total purchases for each customer from bills
        const customersWithTotals = customers.map(customer => {
            const customerBills = bills.filter(bill => bill.customerId === customer.id);
            const actualTotal = customerBills.reduce((sum, bill) => {
                return sum + (bill.finalTotal || bill.grandTotal || 0);
            }, 0);
            
            // Update the customer's totalPurchases if it doesn't match
            if (customer.totalPurchases !== actualTotal) {
                customer.totalPurchases = actualTotal;
                dataManager.updateById('customers', customer.id, { totalPurchases: actualTotal });
            }
            
            return customer;
        });
        
        // Calculate stats
        const businessCustomers = customersWithTotals.filter(customer => customer.type === 'Business');
        const individualCustomers = customersWithTotals.filter(customer => customer.type === 'Individual');
        const totalPurchases = customersWithTotals.reduce((sum, customer) => sum + (customer.totalPurchases || 0), 0);

        res.render('customers/index', {
            title: 'Customer Management - Vikram Steels',
            user: req.session.user,
            customers: customersWithTotals,
            totalCustomers: customersWithTotals.length,
            businessCustomers: businessCustomers.length,
            individualCustomers: individualCustomers.length,
            totalPurchases: totalPurchases,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading customers:', error);
        res.status(500).render('error', { 
            message: 'Error loading customers',
            user: req.session.user 
        });
    }
});

// GET /customers/new - Add new customer form (Admin only)
router.get('/new', requireAuth, requireAdmin, (req, res) => {
    try {
        res.render('customers/form', {
            title: 'Add New Customer - Vikram Steels',
            user: req.session.user,
            customer: null, // New customer
            isEdit: false
        });
    } catch (error) {
        console.error('Error loading new customer form:', error);
        res.status(500).render('error', { 
            message: 'Error loading form',
            user: req.session.user 
        });
    }
});

// GET /customers/:id/edit - Edit customer form (Admin only)
router.get('/:id/edit', requireAuth, requireAdmin, (req, res) => {
    try {
        const customer = dataManager.findBy('customers', { id: req.params.id  })[0];
        
        if (!customer) {
            return res.status(404).render('error', { 
                message: 'Customer not found',
                user: req.session.user 
            });
        }

        res.render('customers/form', {
            title: 'Edit Customer - Vikram Steels',
            user: req.session.user,
            customer: customer,
            isEdit: true
        });
    } catch (error) {
        console.error('Error loading customer edit form:', error);
        res.status(500).render('error', { 
            message: 'Error loading form',
            user: req.session.user 
        });
    }
});

// POST /customers - Create new customer (Admin only)
router.post('/', requireAuth, requireAdmin, (req, res) => {
    try {
        const { name, type, phone, email, addressLine1, addressLine2, city, state, pincode, gstin } = req.body;

        // Validation
        if (!name || !type || !phone || !city || !state || !pincode) {
            return res.redirect('/customers/new?error=Please fill all required fields');
        }

        // Generate customer ID
        const customers = dataManager.getAll('customers');
        const nextId = customers.length + 1;
        const customerId = `cust_${String(nextId).padStart(3, '0')}`;

        // Create customer object
        const newCustomer = {
            id: customerId,
            name: name.trim(),
            type: type,
            contact: {
                phone: phone.trim(),
                email: email.trim(),
                address: {
                    line1: addressLine1.trim(),
                    line2: addressLine2.trim(),
                    city: city.trim(),
                    state: state.trim(),
                    pincode: pincode.trim()
                }
            },
            gst: {
                gstin: gstin ? gstin.trim().toUpperCase() : '',
                isRegistered: gstin ? true : false
            },
            totalPurchases: 0,
            isActive: true,
            createdAt: new Date().toISOString()
        };

        // Add to database
        dataManager.add('customers', newCustomer);

        res.redirect('/customers?success=Customer added successfully');
    } catch (error) {
        console.error('Error creating customer:', error);
        res.redirect('/customers/new?error=Error creating customer');
    }
});

// POST /customers/:id - Update customer (Admin only)
router.post('/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const { name, type, phone, email, addressLine1, addressLine2, city, state, pincode, gstin } = req.body;

        // Validation
        if (!name || !type || !phone || !city || !state || !pincode) {
            return res.redirect(`/customers/${req.params.id}/edit?error=Please fill all required fields`);
        }

        // Update customer
        const updateData = {
            name: name.trim(),
            type: type,
            contact: {
                phone: phone.trim(),
                email: email.trim(),
                address: {
                    line1: addressLine1.trim(),
                    line2: addressLine2.trim(),
                    city: city.trim(),
                    state: state.trim(),
                    pincode: pincode.trim()
                }
            },
            gst: {
                gstin: gstin ? gstin.trim().toUpperCase() : '',
                isRegistered: gstin ? true : false
            }
        };

        const success = dataManager.updateById('customers', req.params.id, updateData);

        if (!success) {
            return res.status(404).render('error', { 
                message: 'Customer not found',
                user: req.session.user 
            });
        }

        res.redirect('/customers?success=Customer updated successfully');
    } catch (error) {
        console.error('Error updating customer:', error);
        res.redirect(`/customers/${req.params.id}/edit?error=Error updating customer`);
    }
});

// POST /customers/:id/delete - Delete customer (Admin only)
router.post('/:id/delete', requireAuth, requireAdmin, (req, res) => {
    try {
        const customer = dataManager.findBy('customers', { id: req.params.id  })[0];
        
        if (!customer) {
            return res.redirect('/customers?error=Customer not found');
        }

        // Soft delete (set isActive to false)
        const updateData = { 
            isActive: false,
            deletedAt: new Date().toISOString()
        };

        const success = dataManager.updateById('customers', req.params.id, updateData);
        
        if (!success) {
            return res.redirect('/customers?error=Customer not found');
        }

        res.redirect('/customers?success=Customer deleted successfully');
    } catch (error) {
        console.error('Error deleting customer:', error);
        res.redirect('/customers?error=Error deleting customer');
    }
});

module.exports = router;
