const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcryptjs');
const dataManager = require('./utils/dataManager');

const app = express();
const PORT = 3000;

// Create default admin user if doesn't exist
const users = dataManager.getAll('users');
const existingAdmin = users.find(user => user.username === 'admin');
if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync('admin123', 10);
    dataManager.add('users', {
        id: 'user_001',
        username: 'admin',
        password: hashedPassword,
        role: 'admin',
        fullName: 'Administrator',
        email: '',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: null
    });
    console.log('✅ Default admin user created');
}

// Create default staff user if doesn't exist
const existingStaff = users.find(user => user.username === 'staff');
if (!existingStaff) {
    const hashedPassword = bcrypt.hashSync('staff123', 10);
    dataManager.add('users', {
        id: 'user_002',
        username: 'staff',
        password: hashedPassword,
        role: 'staff',
        fullName: 'Staff User',
        email: '',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: null
    });
    console.log('✅ Default staff user created');
}

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

// Set EJS as template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
const itemsRouter = require('./routes/items');
const customersRouter = require('./routes/customers');
const billsRouter = require('./routes/bills');
const stockRouter = require('./routes/stock');
const reportsRouter = require('./routes/reports');
const usersRouter = require('./routes/users');
const dataRouter = require('./routes/data');

app.use('/items', (req, res, next) => {
    console.log(`📋 Items route request: ${req.method} ${req.originalUrl}`);
    next();
}, itemsRouter);
app.use('/customers', customersRouter);
app.use('/bills', billsRouter);
app.use('/stock', stockRouter);
app.use('/reports', reportsRouter);
app.use('/users', usersRouter);
app.use('/data', dataRouter);

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
            title: 'Vikram Steels - Dashboard',
            stats: dashboardData
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.render('dashboard', { 
            user: req.session.user,
            title: 'Vikram Steels - Dashboard',
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
    console.log(`🚀 Vikram Steels Billing System running on http://localhost:${PORT}`);
    console.log(`📊 Default login credentials:`);
    console.log(`   Admin: admin / admin123`);
    console.log(`   Staff: staff / staff123`);
    console.log(`📁 Sample data loaded: 9 items, 3 customers, 4 categories`);
    console.log(`⌨️  Keyboard shortcuts ready for implementation`);
});
