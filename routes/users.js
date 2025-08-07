const express = require('express');
const router = express.Router();
const dataManager = require('../utils/dataManager');
const bcrypt = require('bcryptjs');

console.log('👥 User Management router loaded');

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

// GET /users - User management dashboard
router.get('/', requireAdmin, async (req, res) => {
    try {
        const users = await dataManager.getUsers();
        
        res.render('users/index', {
            title: 'User Management',
            user: req.session.user,
            users: users,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).render('error', {
            message: 'Failed to load users',
            user: req.session.user
        });
    }
});

// GET /users/add - Add new user form
router.get('/add', requireAdmin, (req, res) => {
    res.render('users/add', {
        title: 'Add New User',
        user: req.session.user,
        success: req.query.success,
        error: req.query.error
    });
});

// POST /users/add - Create new user
router.post('/add', requireAdmin, async (req, res) => {
    try {
        const { username, email, role, password, fullName } = req.body;
        
        // Validation
        if (!username || !email || !role || !password || !fullName) {
            return res.redirect('/users/add?error=All fields are required');
        }
        
        const users = await dataManager.getUsers();
        
        // Check if username/email already exists
        const existingUser = users.find(u => u.username === username || u.email === email);
        if (existingUser) {
            return res.redirect('/users/add?error=Username or email already exists');
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Generate new user ID
        const maxId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.id.split('_')[1]))) : 0;
        const newId = `user_${String(maxId + 1).padStart(3, '0')}`;
        
        // Create new user
        const newUser = {
            id: newId,
            username: username,
            email: email,
            fullName: fullName,
            role: role,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: null,
            isActive: true
        };
        
        users.push(newUser);
        await dataManager.saveUsers(users);
        
        res.redirect('/users?success=User created successfully');
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.redirect('/users/add?error=Failed to create user');
    }
});

// GET /users/:id/edit - Edit user form
router.get('/:id/edit', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const users = await dataManager.getUsers();
        const editUser = users.find(u => u.id === userId);
        
        if (!editUser) {
            return res.redirect('/users?error=User not found');
        }
        
        res.render('users/edit', {
            title: 'Edit User',
            user: req.session.user,
            editUser: editUser,
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Error loading user for edit:', error);
        res.redirect('/users?error=Failed to load user');
    }
});

// POST /users/:id/edit - Update user
router.post('/:id/edit', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email, role, password, fullName, isActive } = req.body;
        
        // Validation
        if (!username || !email || !role || !fullName) {
            return res.redirect(`/users/${userId}/edit?error=All fields except password are required`);
        }
        
        const users = await dataManager.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.redirect('/users?error=User not found');
        }
        
        // Check if username/email already exists (excluding current user)
        const existingUser = users.find(u => u.id !== userId && (u.username === username || u.email === email));
        if (existingUser) {
            return res.redirect(`/users/${userId}/edit?error=Username or email already exists`);
        }
        
        // Update user data
        users[userIndex].username = username;
        users[userIndex].email = email;
        users[userIndex].fullName = fullName;
        users[userIndex].role = role;
        users[userIndex].isActive = isActive === 'on';
        users[userIndex].updatedAt = new Date().toISOString();
        
        // Update password if provided
        if (password && password.trim() !== '') {
            const hashedPassword = await bcrypt.hash(password, 10);
            users[userIndex].password = hashedPassword;
        }
        
        await dataManager.saveUsers(users);
        
        res.redirect(`/users/${userId}/edit?success=User updated successfully`);
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.redirect(`/users/${req.params.id}/edit?error=Failed to update user`);
    }
});

// POST /users/:id/delete - Delete user
router.post('/:id/delete', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const users = await dataManager.getUsers();
        
        // Prevent deleting the last admin
        const admins = users.filter(u => u.role === 'admin');
        const userToDelete = users.find(u => u.id === userId);
        
        if (userToDelete && userToDelete.role === 'admin' && admins.length === 1) {
            return res.redirect('/users?error=Cannot delete the last admin user');
        }
        
        // Prevent self-deletion
        if (userId === req.session.user.id) {
            return res.redirect('/users?error=Cannot delete your own account');
        }
        
        const filteredUsers = users.filter(u => u.id !== userId);
        
        if (filteredUsers.length === users.length) {
            return res.redirect('/users?error=User not found');
        }
        
        await dataManager.saveUsers(filteredUsers);
        
        res.redirect('/users?success=User deleted successfully');
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.redirect('/users?error=Failed to delete user');
    }
});

// POST /users/:id/toggle-status - Toggle user active status
router.post('/:id/toggle-status', requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const users = await dataManager.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.redirect('/users?error=User not found');
        }
        
        // Prevent deactivating self
        if (userId === req.session.user.id) {
            return res.redirect('/users?error=Cannot deactivate your own account');
        }
        
        users[userIndex].isActive = !users[userIndex].isActive;
        users[userIndex].updatedAt = new Date().toISOString();
        
        await dataManager.saveUsers(users);
        
        const status = users[userIndex].isActive ? 'activated' : 'deactivated';
        res.redirect(`/users?success=User ${status} successfully`);
        
    } catch (error) {
        console.error('Error toggling user status:', error);
        res.redirect('/users?error=Failed to update user status');
    }
});

module.exports = router;
