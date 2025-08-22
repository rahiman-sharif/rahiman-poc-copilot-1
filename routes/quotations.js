const express = require('express');
const router = express.Router();
const fs = require('fs');
const dataManager = require('../utils/dataManager');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// GET /quotations - View all quotations with GST filtering
router.get('/', requireAuth, (req, res) => {
    try {
        const quotationsData = dataManager.readData('quotations');
        let quotations = quotationsData.quotations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        // Extract query parameters for filtering
        const { search, status, dateFrom, dateTo, gstFilter } = req.query;
        
        // Apply GST filter
        if (gstFilter === 'gst') {
            quotations = quotations.filter(quotation => quotation.gstEnabled === true);
        } else if (gstFilter === 'normal') {
            quotations = quotations.filter(quotation => quotation.gstEnabled === false);
        }
        
        // Apply search filter
        if (search && search.trim()) {
            const searchTerm = search.trim().toLowerCase();
            quotations = quotations.filter(quotation => {
                const quotationNumber = (quotation.quotationNumber || '').toLowerCase();
                const customerName = (quotation.customerInfo?.name || '').toLowerCase();
                const customerPhone = (quotation.customerInfo?.phone || '').toLowerCase();
                
                return quotationNumber.includes(searchTerm) || 
                       customerName.includes(searchTerm) || 
                       customerPhone.includes(searchTerm);
            });
        }
        
        // Apply status filter
        if (status && status.trim()) {
            quotations = quotations.filter(quotation => {
                let quotationStatus = quotation.status || 'active';
                
                // Check if expired
                const validUntil = new Date(quotation.validUntil);
                const isExpired = validUntil < new Date();
                if (quotationStatus === 'active' && isExpired) {
                    quotationStatus = 'expired';
                }
                
                return quotationStatus === status;
            });
        }
        
        // Apply date range filter
        if (dateFrom || dateTo) {
            quotations = quotations.filter(quotation => {
                const quotationDate = new Date(quotation.quotationDate);
                
                if (dateFrom && dateTo) {
                    const fromDate = new Date(dateFrom);
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999); // Include the entire day
                    return quotationDate >= fromDate && quotationDate <= toDate;
                } else if (dateFrom) {
                    const fromDate = new Date(dateFrom);
                    return quotationDate >= fromDate;
                } else if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999); // Include the entire day
                    return quotationDate <= toDate;
                }
                
                return true;
            });
        }
        
        // No need to fetch customers as quotations contain customer info directly
        const quotationsWithCustomers = quotations.map(quotation => {
            return {
                ...quotation,
                customerName: quotation.customerInfo ? quotation.customerInfo.name : 'Unknown Customer'
            };
        });

        // Calculate stats (on filtered results)
        const today = new Date().toISOString().split('T')[0];
        const todaysQuotations = quotations.filter(quotation => quotation.createdAt.split('T')[0] === today);
        const totalToday = todaysQuotations.reduce((sum, quotation) => sum + (quotation.finalTotal || 0), 0);
        const activeQuotations = quotations.filter(quotation => {
            const validUntil = new Date(quotation.validUntil);
            const isExpired = validUntil < new Date();
            return quotation.status === 'active' && !isExpired;
        }).length;

        // Calculate GST statistics
        const gstQuotations = quotations.filter(quotation => quotation.gstEnabled);
        const normalQuotations = quotations.filter(quotation => !quotation.gstEnabled);

        res.render('quotations/index', {
            title: `Quotations - ${res.locals.companyName}`,
            user: req.session.user,
            quotations: quotationsWithCustomers,
            customers: [], // Empty array since we don't use customer selection in filters
            totalQuotations: quotations.length,
            todaysValue: totalToday,
            activeQuotations: activeQuotations,
            gstQuotationsCount: gstQuotations.length,
            normalQuotationsCount: normalQuotations.length,
            currentFilter: gstFilter || 'all',
            query: req.query
        });
    } catch (error) {
        console.error('Error loading quotations:', error);
        res.status(500).render('error', { 
            message: 'Error loading quotations',
            user: req.session.user 
        });
    }
});

// GET /quotations/new - Create new quotation form
router.get('/new', requireAuth, (req, res) => {
    try {
        const customers = dataManager.findBy('customers', { isActive: true });
        const items = dataManager.findBy('items', { isActive: true });
        const companyData = dataManager.readData('company');
        const company = companyData.company || {
            name: 'Company Name',
            address: {
                line1: '218/4B, Checkanurani',
                line2: 'Madurai High Way, Arul Nagar, Uathupatti, Thirumanglam (T.K)',
                city: 'Madurai',
                state: 'Tamil Nadu',
                pincode: '160002',
                country: 'India'
            },
            contact: {
                phone1: '+91-9042412524',
                phone2: '+91-9626260336',
                email: 'info@vikramsteels.com'
            },
            gst: {
                gstin: '33EEOPR7876R1ZZ',
                panNo: 'ABCDE1234F'
            }
        };
        // Generate quotation numbers with proper counters
        const quotationsData = dataManager.readData('quotations');
        const nextNormalQuotationNumber = quotationsData.nextNormalQuotationNumber || 1;
        const nextGSTQuotationNumber = quotationsData.nextGSTQuotationNumber || 1;
        
        res.render('quotations/form', {
            title: `Create New Quotation - ${res.locals.companyName}`,
            user: req.session.user,
            customers: customers,
            items: items,
            company: company,
            nextQuotationNumber: nextNormalQuotationNumber,
            nextGSTQuotationNumber: nextGSTQuotationNumber,
            quotation: null,
            isEdit: false
        });
    } catch (error) {
        console.error('Error loading new quotation form:', error);
        res.status(500).render('error', { 
            message: 'Error loading form',
            user: req.session.user 
        });
    }
});

// GET /quotations/:id - View quotation details
router.get('/:id', requireAuth, (req, res) => {
    try {
        const quotationsData = dataManager.getQuotationsData();
        const quotation = quotationsData.quotations.find(q => q.id === req.params.id);
        const companyData = dataManager.readData('company');
        const company = companyData.company || {
            name: 'Company Name',
            address: {
                line1: '218/4B, Checkanurani',
                line2: 'Madurai High Way, Arul Nagar, Uathupatti, Thirumanglam (T.K)',
                city: 'Madurai',
                state: 'Tamil Nadu',
                pincode: '160002',
                country: 'India'
            },
            contact: {
                phone1: '+91-9042412524',
                phone2: '+91-9626260336',
                email: 'info@vikramsteels.com'
            },
            gst: {
                gstin: '33EEOPR7876R1ZZ',
                panNo: 'ABCDE1234F'
            }
        };
        
        if (!quotation) {
            return res.status(404).render('error', { 
                message: 'Quotation not found',
                user: req.session.user 
            });
        }

        // Customer info is directly embedded in quotation
        const customer = quotation.customerInfo || { 
            name: 'Unknown Customer', 
            phone: '', 
            email: '', 
            gstin: '', 
            address: '',
            contact: { phone: '' },
            gst: { gstin: '' }
        };

        res.render('quotations/view', {
            title: `Quotation ${quotation.quotationNumber} - ${res.locals.companyName}`,
            user: req.session.user,
            quotation: quotation,
            customer: customer,
            company: company,
            query: req.query
        });
    } catch (error) {
        console.error('Error loading quotation:', error);
        res.status(500).render('error', { 
            message: 'Error loading quotation',
            user: req.session.user 
        });
    }
});

// POST /quotations - Create new quotation with GST support
router.post('/', requireAuth, (req, res) => {
    try {
        const { 
            customerType,
            existingCustomerId,
            customerName,
            customerPhone,
            customerEmail,
            customerGstin,
            customerAddress,
            quotationDate, 
            validityDays = 30,
            quotationItems,
            extraCharges,
            subtotal,
            cgstAmount,
            sgstAmount,
            finalTotal,
            gstEnabled, // NEW: GST toggle field
            gstEnabledValue // NEW: GST hidden field
        } = req.body;

        // Parse GST enabled status - check both checkbox and hidden field
        const isGSTEnabled = gstEnabled === 'on' || gstEnabled === 'true' || gstEnabledValue === 'true';
        
        let customerInfo = {};
        
        // Handle customer information based on type
        if (customerType === 'existing' && existingCustomerId) {
            // Get existing customer data
            const customers = dataManager.getAll('customers');
            const existingCustomer = customers.find(c => c.id === existingCustomerId);
            
            if (!existingCustomer) {
                return res.redirect('/quotations/new?error=Selected customer not found');
            }
            
            customerInfo = {
                customerId: existingCustomer.id,
                name: existingCustomer.name,
                phone: existingCustomer.contact.phone,
                email: existingCustomer.contact.email || '',
                gstin: existingCustomer.gst.gstin || '',
                address: [
                    existingCustomer.contact.address.line1,
                    existingCustomer.contact.address.line2,
                    existingCustomer.contact.address.city,
                    existingCustomer.contact.address.state,
                    existingCustomer.contact.address.pincode
                ].filter(Boolean).join(', ')
            };
        } else {
            // New customer - manual input
            if (!customerName || !customerPhone) {
                return res.redirect('/quotations/new?error=Please fill customer name and phone number');
            }
            
            // Create customer info for quotation
            customerInfo = {
                name: customerName.trim(),
                phone: customerPhone.trim(),
                email: customerEmail ? customerEmail.trim() : '',
                gstin: customerGstin ? customerGstin.trim() : '',
                address: customerAddress ? customerAddress.trim() : ''
            };
            
            // Save new customer to customer database immediately
            const customersData = dataManager.readData('customers');
            
            // Check if customer already exists by phone number (primary unique identifier)
            const existingCustomerInDb = customersData.customers.find(c => 
                c.contact?.phone === customerInfo.phone
            );
            
            if (!existingCustomerInDb) {
                // Generate customer ID
                const nextCustomerId = customersData.customers.length + 1;
                const customerId = `customer_${Date.now()}_${nextCustomerId}`;
                
                // Create new customer record
                const newCustomer = {
                    id: customerId,
                    name: customerInfo.name,
                    type: "Individual", // Default for quotation customers
                    contact: {
                        phone: customerInfo.phone,
                        email: customerInfo.email || '',
                        address: {
                            line1: customerInfo.address || '',
                            line2: '',
                            city: '',
                            state: '',
                            pincode: '',
                            country: 'India'
                        }
                    },
                    gst: {
                        gstin: customerInfo.gstin || '',
                        panNo: '',
                        registrationType: customerInfo.gstin ? 'Regular' : 'Unregistered',
                        isRegistered: !!customerInfo.gstin
                    },
                    paymentTerms: "Cash",
                    creditLimit: 0,
                    outstandingAmount: 0,
                    isActive: true,
                    totalPurchases: 0, // Will be updated when quotation converts to bill
                    totalBills: 0,
                    lastPurchase: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    createdFrom: 'quotation' // Track that this customer came from quotation
                };
                
                // Add customer to database
                customersData.customers.push(newCustomer);
                customersData.lastUpdated = new Date().toISOString();
                dataManager.writeData('customers', customersData);
                
                // Add customer ID to quotation customer info
                customerInfo.customerId = customerId;
                
                console.log(`✅ New customer created from quotation: ${customerInfo.name} (${customerId})`);
            } else {
                // Use existing customer ID
                customerInfo.customerId = existingCustomerInDb.id;
                console.log(`📋 Using existing customer for quotation: ${customerInfo.name} (${existingCustomerInDb.id})`);
            }
        }
        
        // Validation
        if (!quotationDate) {
            return res.redirect('/quotations/new?error=Please fill quotation date');
        }

        // Parse items and charges
        let items = [];
        let charges = [];
        
        try {
            items = quotationItems ? JSON.parse(quotationItems) : [];
            charges = extraCharges ? JSON.parse(extraCharges) : [];
        } catch (e) {
            return res.redirect('/quotations/new?error=Invalid data format');
        }

        if (items.length === 0) {
            return res.redirect('/quotations/new?error=Please add at least one item');
        }

        // Generate quotation ID based on GST status
        const quotationId = dataManager.generateNextQuotationId(isGSTEnabled);
        if (!quotationId) {
            return res.redirect('/quotations/new?error=Failed to generate quotation number. Please try again.');
        }

        // Use the full quotation ID as the quotation number for display
        const quotationNumber = quotationId;

        // Calculate validity date
        const validityDate = new Date(quotationDate);
        validityDate.setDate(validityDate.getDate() + parseInt(validityDays));

        // Create quotation object with GST support
        const newQuotation = {
            id: quotationId,
            quotationNumber: quotationNumber,
            gstEnabled: isGSTEnabled,
            documentType: isGSTEnabled ? 'GST' : 'NORMAL',
            customerInfo: customerInfo, // Store customer info directly, not reference
            quotationDate: quotationDate,
            validUntil: validityDate.toISOString().split('T')[0], // YYYY-MM-DD format
            validityDays: parseInt(validityDays),
            items: items,
            extraCharges: charges,
            subtotal: parseFloat(subtotal) || 0,
            cgstAmount: isGSTEnabled ? (parseFloat(cgstAmount) || 0) : 0,
            sgstAmount: isGSTEnabled ? (parseFloat(sgstAmount) || 0) : 0,
            finalTotal: parseFloat(finalTotal) || 0,
            status: 'active',
            createdBy: req.session.user.id,
            createdAt: new Date().toISOString()
        };

        // Save quotation using new GST-aware method
        const success = dataManager.addQuotationWithGST(newQuotation);
        
        if (!success) {
            return res.redirect('/quotations/new?error=Failed to save quotation. Please try again.');
        }

        console.log('✅ About to redirect to:', `/quotations/${newQuotation.id}?success=Quotation created successfully`);
        res.redirect(`/quotations/${newQuotation.id}?success=Quotation created successfully`);
    } catch (error) {
        console.error('Error creating quotation:', error);
        res.redirect('/quotations/new?error=Error creating quotation');
    }
});

// POST /quotations/:id/convert - Convert quotation to bill
router.post('/:id/convert', requireAuth, (req, res) => {
    try {
        const quotationId = req.params.id;
        const quotationsData = dataManager.readData('quotations');
        const quotationIndex = quotationsData.quotations.findIndex(q => q.id === quotationId);
        
        if (quotationIndex === -1) {
            return res.redirect(`/quotations/${quotationId}?error=Quotation not found`);
        }

        const quotation = quotationsData.quotations[quotationIndex];
        
        // Check if quotation is already converted
        if (quotation.status === 'converted') {
            return res.redirect(`/quotations/${quotationId}?error=Quotation is already converted to a bill`);
        }

        // Check if quotation is expired
        const validUntil = new Date(quotation.validUntil);
        const isExpired = validUntil < new Date();
        if (isExpired) {
            return res.redirect(`/quotations/${quotationId}?error=Cannot convert expired quotation to bill`);
        }

        // Validate stock availability for all items before conversion
        const itemsForValidation = dataManager.readData('items');
        for (const quotationItem of quotation.items) {
            const currentItem = itemsForValidation.items.find(item => item.id === quotationItem.itemId);
            if (!currentItem) {
                return res.redirect(`/quotations/${quotationId}?error=Item not found: ${quotationItem.itemName}. Cannot convert quotation.`);
            }
            
            // Only check stock for physical items, not services
            if (!quotationItem.isServiceItem) {
                const availableStock = currentItem.stock?.quantity || 0;
                if (availableStock < quotationItem.quantity) {
                    return res.redirect(`/quotations/${quotationId}?error=Insufficient stock for ${quotationItem.itemName}. Available: ${availableStock} ${currentItem.unit}, Required: ${quotationItem.quantity} ${currentItem.unit}. Cannot convert quotation to bill.`);
                }
            }
        }

        // Get bills data and determine bill numbering based on quotation GST status
        const billsData = dataManager.readData('bills');
        const isGSTBill = quotation.gstEnabled || quotation.documentType === 'GST';
        
        let billId, displayBillNumber;
        if (isGSTBill) {
            // GST Bill numbering
            const nextGSTBillNumber = billsData.nextGSTBillNumber || 1;
            billId = `GST-BILL-${String(nextGSTBillNumber).padStart(3, '0')}`;
            displayBillNumber = `GST-BILL-${String(nextGSTBillNumber).padStart(3, '0')}`;
        } else {
            // Normal Bill numbering  
            const nextNormalBillNumber = billsData.nextNormalBillNumber || 1;
            billId = `BILL-${String(nextNormalBillNumber).padStart(3, '0')}`;
            displayBillNumber = `BILL-${String(nextNormalBillNumber).padStart(3, '0')}`;
        }

        // Create bill from quotation with consistent structure
        const newBill = {
            id: billId,
            billNumber: displayBillNumber,
            gstEnabled: isGSTBill,
            documentType: isGSTBill ? 'GST' : 'NORMAL',
            customerId: quotation.customerInfo.customerId || `cust_${Date.now()}`, // Use existing or generate ID
            customerName: quotation.customerInfo.name,
            customerPhone: quotation.customerInfo.phone,
            customerGstin: quotation.customerInfo.gstin || '',
            billDate: new Date().toISOString(),
            items: quotation.items.map(item => ({
                ...item,
                stockReduced: true
            })),
            extraCharges: quotation.extraCharges || [],
            subtotal: quotation.subtotal,
            cgstAmount: quotation.cgstAmount || 0,
            sgstAmount: quotation.sgstAmount || 0,
            totalGst: (quotation.cgstAmount || 0) + (quotation.sgstAmount || 0),
            finalTotal: quotation.finalTotal,
            paymentMethod: 'Cash', // Default payment method
            paymentDetails: {
                method: 'Cash'
            },
            createdBy: req.session.user.id,
            createdAt: new Date().toISOString(),
            convertedFromQuotation: quotationId,
            convertedFromQuotationNumber: quotation.quotationNumber
        };

        // Add bill to database using GST-aware method
        const success = dataManager.addBillWithGST(newBill);
        
        if (!success) {
            return res.redirect(`/quotations/${quotationId}?error=Failed to convert quotation to bill. Please try again.`);
        }

        // Update item stock quantities using dataManager (only for physical items)
        quotation.items.forEach(quotationItem => {
            if (!quotationItem.isServiceItem) {
                const currentItem = dataManager.findBy('items', { id: quotationItem.itemId })[0];
                if (currentItem) {
                    const currentStock = currentItem.stock?.quantity || 0;
                    const newQuantity = Math.max(0, currentStock - quotationItem.quantity);
                    
                    // Update stock using dataManager
                    dataManager.updateNestedProperty('items', quotationItem.itemId, 'stock.quantity', newQuantity);
                    dataManager.updateById('items', quotationItem.itemId, {
                        lastStockUpdate: new Date().toISOString(),
                        lastStockMovement: {
                            type: 'sale',
                            quantity: quotationItem.quantity,
                            billId: newBill.id,
                            soldAt: new Date().toISOString()
                        }
                    });

                    // Create stock movement record
                    const stockMovement = {
                        id: `movement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        type: 'sale',
                        itemId: quotationItem.itemId,
                        itemName: quotationItem.itemName,
                        quantity: -quotationItem.quantity, // Negative for sales (stock decrease)
                        oldStock: currentStock,
                        newStock: newQuantity,
                        reference: `Bill #${newBill.billNumber}`,
                        reason: `Sale to ${quotation.customerInfo.name}`,
                        billId: newBill.id,
                        customerId: newBill.customerId,
                        customerName: quotation.customerInfo.name,
                        date: new Date().toISOString(),
                        user: req.session.user ? req.session.user.id : 'unknown',
                        userName: req.session.user ? req.session.user.username : 'Unknown'
                    };

                    // Add to stock movements
                    dataManager.add('stock-movements', stockMovement);
                }
            }
        });

        // Update customer data if customer doesn't exist
        let existingCustomer = dataManager.findBy('customers', c => 
            c.contact?.phone === quotation.customerInfo.phone
        )[0];

        if (!existingCustomer) {
            // Create new customer using dataManager
            const newCustomer = {
                id: quotation.customerInfo.customerId || `cust_${Date.now()}`,
                name: quotation.customerInfo.name,
                type: "Individual", // Default type for converted quotations
                contact: {
                    phone: quotation.customerInfo.phone,
                    email: quotation.customerInfo.email || '',
                    address: {
                        line1: quotation.customerInfo.address || '',
                        line2: '',
                        city: '',
                        state: '',
                        pincode: '',
                        country: 'India'
                    }
                },
                gst: {
                    gstin: quotation.customerInfo.gstin || '',
                    panNo: '',
                    registrationType: quotation.customerInfo.gstin ? 'Regular' : 'Unregistered',
                    isRegistered: !!quotation.customerInfo.gstin
                },
                paymentTerms: "Cash",
                creditLimit: 0,
                outstandingAmount: 0,
                isActive: true,
                totalPurchases: quotation.finalTotal,
                totalBills: 1,
                lastPurchase: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Add customer using dataManager
            dataManager.add('customers', newCustomer);
        } else {
            // Update existing customer
            const currentTotal = existingCustomer.totalPurchases || 0;
            dataManager.updateById('customers', existingCustomer.id, {
                totalPurchases: currentTotal + quotation.finalTotal,
                totalBills: (existingCustomer.totalBills || 0) + 1,
                lastPurchase: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        // Mark quotation as converted using dataManager
        quotationsData.quotations[quotationIndex].status = 'converted';
        quotationsData.quotations[quotationIndex].convertedAt = new Date().toISOString();
        quotationsData.quotations[quotationIndex].convertedToBill = newBill.id;
        quotationsData.lastUpdated = new Date().toISOString();
        dataManager.writeData('quotations', quotationsData);

        res.redirect(`/bills/${newBill.id}?success=Quotation converted to bill successfully! Bill number: ${newBill.billNumber}`);
    } catch (error) {
        console.error('Error converting quotation to bill:', error);
        res.redirect(`/quotations/${req.params.id}?error=Error converting quotation to bill`);
    }
});

// GET /quotations/:id/print - Print quotation
router.get('/:id/print', requireAuth, (req, res) => {
    try {
        const quotationId = req.params.id;
        const quotationsData = dataManager.readData('quotations');
        const quotation = quotationsData.quotations.find(q => q.id === quotationId);
        
        if (!quotation) {
            return res.status(404).render('error', { 
                message: 'Quotation not found',
                user: req.session.user 
            });
        }

        // Company information
        const companyData = dataManager.readData('company');
        const company = companyData.company || {
            name: 'Company Name',
            address: {
                line1: '218/4B, Checkanurani',
                line2: 'Madurai High Way, Arul Nagar, Uathupatti, Thirumanglam (T.K)',
                city: 'Madurai',
                state: 'Tamil Nadu',
                pincode: '160002',
                country: 'India'
            },
            contact: {
                phone1: '+91-9042412524',
                phone2: '+91-9626260336',
                email: 'info@vikramsteels.com'
            },
            gst: {
                gstin: '33EEOPR7876R1ZZ',
                panNo: 'ABCDE1234F'
            }
        };

        res.render('quotations/print-compact', {
            title: `Print Quotation ${quotation.quotationNumber} - Compact`,
            user: req.session.user,
            quotation: quotation,
            company: company,
            companyName: company.name || 'Vikram Steels',
            layout: false // No layout for print view
        });
    } catch (error) {
        console.error('Error loading quotation for print:', error);
        res.status(500).render('error', { 
            message: 'Error loading quotation for print',
            user: req.session.user 
        });
    }
});

// GET /:id/print-original - Print quotation (original template)
router.get('/:id/print-original', requireAuth, async (req, res) => {
    try {
        const quotationId = req.params.id;
        console.log(`📄 Loading quotation ${quotationId} for original print`);
        
        const quotation = dataManager.getById('quotations', quotationId);
        if (!quotation) {
            console.log(`❌ Quotation ${quotationId} not found`);
            return res.status(404).render('error', { 
                message: 'Quotation not found',
                user: req.session.user 
            });
        }

        // Get company information from settings
        const company = {
            name: 'Vikram Steels',
            address: {
                line1: 'Industrial Area',
                line2: 'Phase-1',
                city: 'Chennai',
                state: 'Tamil Nadu',
                pincode: '600001'
            },
            contact: {
                phone1: '+91 98765 43210',
                phone2: '+91 98765 43211',
                email: 'info@vikramsteels.com'
            },
            gst: {
                gstin: '33EEOPR7876R1ZZ',
                panNo: 'ABCDE1234F'
            }
        };

        res.render('quotations/print', {
            title: `Print Quotation ${quotation.quotationNumber} - Original`,
            user: req.session.user,
            quotation: quotation,
            company: company
        });
    } catch (error) {
        console.error('Error loading quotation for original print:', error);
        res.status(500).render('error', { 
            message: 'Error loading quotation for original print',
            user: req.session.user 
        });
    }
});

// DELETE /quotations/:id - Delete quotation
router.delete('/:id', requireAuth, (req, res) => {
    try {
        // Check admin/manager permissions
        if (req.session.user.role !== 'admin' && req.session.user.role !== 'manager') {
            return res.status(403).json({ success: false, error: 'Access denied' });
        }

        const quotationId = req.params.id;
        const quotationsData = dataManager.readData('quotations');
        const quotationIndex = quotationsData.quotations.findIndex(q => q.id === quotationId);
        
        if (quotationIndex === -1) {
            return res.status(404).json({ success: false, error: 'Quotation not found' });
        }

        // Remove the quotation
        quotationsData.quotations.splice(quotationIndex, 1);
        quotationsData.lastUpdated = new Date().toISOString();
        
        // Save updated data
        dataManager.writeData('quotations', quotationsData);

        res.json({ success: true, message: 'Quotation deleted successfully' });
    } catch (error) {
        console.error('Error deleting quotation:', error);
        res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

module.exports = router;
