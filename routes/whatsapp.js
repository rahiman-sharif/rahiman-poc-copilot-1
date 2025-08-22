const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const appConfig = require('../utils/app-config');

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Format number for WhatsApp
function formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Remove leading zeros, if any
    const withoutLeadingZeros = cleaned.replace(/^0+/, '');
    
    // If it starts with a country code, use it, otherwise assume India (+91)
    if (withoutLeadingZeros.startsWith('91') && withoutLeadingZeros.length >= 12) {
        return withoutLeadingZeros;
    } else {
        return '91' + withoutLeadingZeros;
    }
}

// GET /whatsapp - WhatsApp integration page
router.get('/', requireAuth, (req, res) => {
    try {
        const { dateRange, fromDate, toDate } = req.query;
        
        // Get all bills
        let bills = dataManager.getAll('bills');
        
        // Apply date filtering
        const today = new Date();
        let startDate = null;
        let endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999); // End of today
        
        if (dateRange === 'custom' && fromDate && toDate) {
            // Custom date range
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999); // End of selected day
        } else if (dateRange === 'month') {
            // This month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (dateRange === 'all') {
            // All time - no date filtering
            startDate = null;
        } else {
            // Default: Today's bills only
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0); // Start of today
        }
        
        // Filter bills by date if startDate is set
        if (startDate) {
            bills = bills.filter(bill => {
                const billDate = new Date(bill.billDate);
                return billDate >= startDate && billDate <= endDate;
            });
        }
        
        // Sort bills by date (newest first)
        bills.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
        
        res.render('whatsapp/index', {
            title: 'Send Bills via WhatsApp',
            user: req.session.user,
            bills: bills,
            companyName: res.locals.companyName,
            dateRange: dateRange || 'today',
            fromDate: fromDate || today.toISOString().split('T')[0],
            toDate: toDate || today.toISOString().split('T')[0]
        });
    } catch (error) {
        console.error('Error in WhatsApp route:', error);
        res.status(500).render('error', { 
            title: 'Error',
            message: 'Failed to load WhatsApp page',
            error: error,
            user: req.session.user,
            companyName: res.locals.companyName
        });
    }
});

// POST /whatsapp/send - Prepare WhatsApp message for filtered bills
router.post('/send', requireAuth, (req, res) => {
    try {
        const { phoneNumber, dateRange, fromDate, toDate } = req.body;
        
        // Validate inputs
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Invalid request. Please provide a phone number.'
            });
        }
        
        // Format phone number for WhatsApp
        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        // Get all bills and apply filtering
        const allBills = dataManager.getAll('bills');
        
        // Apply date filtering
        const today = new Date();
        let startDate = null;
        let endDate = new Date(today);
        endDate.setHours(23, 59, 59, 999); // End of today
        
        if (dateRange === 'custom' && fromDate && toDate) {
            // Custom date range
            startDate = new Date(fromDate);
            endDate = new Date(toDate);
            endDate.setHours(23, 59, 59, 999); // End of selected day
        } else if (dateRange === 'month') {
            // This month
            startDate = new Date(today.getFullYear(), today.getMonth(), 1);
            endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        } else if (dateRange === 'all') {
            // All time - no date filtering
            startDate = null;
        } else {
            // Default: Today's bills only
            startDate = new Date(today);
            startDate.setHours(0, 0, 0, 0); // Start of today
        }
        
        // Filter bills by date if startDate is set
        let filteredBills = allBills;
        if (startDate) {
            filteredBills = allBills.filter(bill => {
                const billDate = new Date(bill.billDate);
                return billDate >= startDate && billDate <= endDate;
            });
        }
        
        // Sort bills by date (newest first)
        filteredBills.sort((a, b) => new Date(b.billDate) - new Date(a.billDate));
        
        const selectedBills = filteredBills;
        
        if (selectedBills.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No bills found for the selected date range.'
            });
        }
        
        // Format the message
        let message = `*${res.locals.companyName}* - Sales Summary\n\n`;
        
        // Add date range info
        if (dateRange === 'today') {
            message += `📅 Date: ${today.toLocaleDateString()}\n`;
        } else if (dateRange === 'month') {
            message += `📅 Period: This Month\n`;
        } else if (dateRange === 'custom') {
            message += `📅 Period: ${fromDate} to ${toDate}\n`;
        } else {
            message += `📅 Period: All Time\n`;
        }
        
        message += `⏰ Generated: ${today.toLocaleDateString()} ${today.toLocaleTimeString()}\n\n`;
        
        // Statistics
        const totalRevenue = selectedBills.reduce((sum, bill) => sum + parseFloat(bill.finalTotal || 0), 0);
        const totalGst = selectedBills.reduce((sum, bill) => sum + parseFloat(bill.totalGst || 0), 0);
        const uniqueCustomers = new Set(selectedBills.map(bill => bill.customerName)).size;
        
        message += `📊 *SUMMARY*\n`;
        message += `• Total Bills: ${selectedBills.length}\n`;
        message += `• Total Revenue: ₹${totalRevenue.toFixed(2)}\n`;
        message += `• Total GST: ₹${totalGst.toFixed(2)}\n`;
        message += `• Unique Customers: ${uniqueCustomers}\n\n`;
        
        // Bill details
        message += `📋 *BILL DETAILS*\n`;
        message += `${'-'.repeat(40)}\n`;
        
        selectedBills.forEach((bill, index) => {
            message += `🧾 *${index + 1}. ${bill.billNumber}*\n`;
            message += `┣━ 📅 Date: ${new Date(bill.billDate).toLocaleDateString()}\n`;
            message += `┣━ 👤 Customer: ${bill.customerName}\n`;
            
            if (bill.items && bill.items.length > 0) {
                message += `┣━ 📦 Items (${bill.items.length}):\n`;
                bill.items.forEach((item, i) => {
                    const itemName = item.itemName || item.name || 'Item';
                    const quantity = item.quantity || 0;
                    const rate = item.rate || 0;
                    const amount = item.amount || (quantity * rate);
                    message += `┃  • ${itemName}\n`;
                    message += `┃    ${quantity} pcs × Rs.${rate}\n`;
                });
            }
            
            if (bill.extraCharges && bill.extraCharges.length > 0) {
                message += `┣━ 💰 Extra Charges (${bill.extraCharges.length}):\n`;
                bill.extraCharges.forEach((charge, i) => {
                    message += `┃  • ${charge.description || charge.name}: Rs.${charge.amount}\n`;
                });
            }
            
            // Show GST breakdown for GST bills
            const billTotalGst = parseFloat(bill.totalGst || 0);
            const billSubtotal = parseFloat(bill.subtotal || 0);
            const billCgst = parseFloat(bill.cgstAmount || 0);
            const billSgst = parseFloat(bill.sgstAmount || 0);
            
            if (billTotalGst > 0) {
                message += `┣━ 💰 Subtotal: Rs.${billSubtotal}\n`;
                message += `┣━ 📊 CGST: Rs.${billCgst}\n`;
                message += `┣━ 📊 SGST: Rs.${billSgst}\n`;
                message += `┣━ 💵 *Total: Rs.${bill.finalTotal}*\n`;
            } else {
                message += `┣━ 💵 *Total: Rs.${bill.finalTotal}*\n`;
            }
            
            message += `┗━ 💳 Payment: ${bill.paymentMethod}\n`;
            
            if (index < selectedBills.length - 1) {
                message += `\n`;
            }
        });
        
        message += `\n${'-'.repeat(40)}\n`;
        message += `\n_Generated from ${res.locals.companyName} Billing System_`;
        
        // Create WhatsApp URL
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${formattedPhone}/?text=${encodedMessage}`;
        
        // Send response with URL
        res.json({
            success: true,
            url: whatsappUrl
        });
    } catch (error) {
        console.error('Error generating WhatsApp message:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate WhatsApp message'
        });
    }
});

module.exports = router;
