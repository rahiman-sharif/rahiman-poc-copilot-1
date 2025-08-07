# 🏢 Vikram Steels Billing System

A complete offline billing and inventory management system designed for traditional Indian businesses like steel traders, hardware stores, and construction material suppliers.

## ✨ Features

### 🔐 Authentication System
- **Role-based access control** (Admin/Staff)
- **Secure password hashing** with bcrypt
- **Session management** with persistent login
- **Default admin account**: `admin` / `admin123`

### 📊 Upcoming Modules
- **Item Management** - Add, edit, delete items with GST support
- **Customer Database** - Manage customer information and billing history
- **GST-Compliant Billing** - Generate tax invoices with CGST/SGST
- **Stock Management** - Track inventory with auto-deduction
- **Reports** - Daily, monthly, and custom range sales reports
- **Company Settings** - Configure business information and invoice templates

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- Windows/Linux/macOS

### Installation

1. **Clone or download** the project to your local machine
2. **Navigate** to the project directory
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Start the application**:
   ```bash
   npm start
   ```
5. **Open your browser** and go to `http://localhost:3000`

### Default Login
- **Username**: `admin`
- **Password**: `admin123`

## 🏗️ Project Structure

```
vikram-steels/
├── data/                   # JSON database files (MongoDB migration ready)
│   └── users.json         # User accounts and roles
├── public/                # Static assets (CSS, JS, images)
│   ├── css/
│   └── js/
├── views/                 # EJS templates
│   ├── login.ejs         # Login page
│   └── dashboard.ejs     # Main dashboard
├── routes/               # Express route handlers (future)
├── server.js            # Main application server
└── package.json         # Dependencies and scripts
```

## 💾 Database Design

The system uses **Lowdb** (JSON-based) for offline operation with **MongoDB migration** in mind:

- `users.json` - User accounts and authentication
- `items.json` - Product catalog with pricing and GST
- `customers.json` - Customer information and history
- `bills.json` - Invoice records and billing data
- `categories.json` - Product categories and classification
- `stock.json` - Inventory levels and stock movements
- `company.json` - Business information and settings

## 🔧 Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: EJS templating + Vanilla CSS/JS
- **Database**: Lowdb (JSON files)
- **Authentication**: bcryptjs + express-session
- **Architecture**: MVC pattern, offline-first design

## 📋 Development Roadmap

### Phase 1: Core Authentication ✅
- [x] User login/logout system
- [x] Session management
- [x] Role-based access control
- [x] Dashboard with welcome screen

### Phase 2: Item Management ⏳
- [ ] Add/Edit/Delete items
- [ ] GST configuration per item
- [ ] Category management
- [ ] Stock quantity tracking
- [ ] Unit of measure support

### Phase 3: Customer & Billing ⏳
- [ ] Customer database
- [ ] Invoice generation
- [ ] GST calculations (CGST/SGST)
- [ ] Payment type tracking
- [ ] Print-ready invoice format

### Phase 4: Advanced Features ⏳
- [ ] Stock management
- [ ] Sales reports
- [ ] Data backup/restore
- [ ] Multi-user support

## 🎯 Business-Specific Features

### Traditional Indian Billing
- **GST-compliant invoices** with proper tax breakdown
- **Weight-based pricing** for steel and construction materials
- **Service items** for charges like loading/transport
- **Bundle tracking** (e.g., "Each bundle = 70 kg")
- **Traditional invoice format** matching existing business practices

### Steel Trading Specific
- Support for **weight-based items** (kg, bundles)
- **Brand management** for different steel manufacturers
- **HSN code** support for GST compliance
- **Loading/Transport charges** as service items

## 🔒 Security Features

- **Password hashing** with bcrypt
- **Session-based authentication**
- **Role-based access control**
- **Local data storage** (no cloud dependency)
- **Offline operation** for data security

## 📱 Browser Support

- **Chrome** (Recommended)
- **Firefox**
- **Edge**
- **Safari**

## 🛠️ Development

### Adding New Features
1. Create route handlers in `/routes/`
2. Add EJS templates in `/views/`
3. Update database schema in `/data/`
4. Follow the existing authentication middleware pattern

### Running in Development
```bash
npm run dev
```

### Database Location
All data files are stored in the `/data/` directory. You can backup this folder to preserve all business data.

## 📞 Support

This system is designed for **offline operation** and traditional Indian business workflows. All data is stored locally for maximum security and reliability.

---

**© 2025 Vikram Steels Billing System** - Built for traditional businesses, designed for the future.
