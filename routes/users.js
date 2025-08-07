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
        error: req.query.error,
        formData: null
    });
});

// POST /users/add - Create new user
router.post('/add', requireAdmin, async (req, res) => {
    try {
        console.log('Received form data:', req.body);
        const { username, email, role, password, fullName, status } = req.body;
        
        console.log('Extracted fields:', {
            username: `"${username}"`,
            email: `"${email}"`,
            role: `"${role}"`,
            password: password ? '[PROVIDED]' : '[EMPTY]',
            fullName: `"${fullName}"`,
            status: `"${status}"`
        });
        
        // Validation - trim whitespace and check for empty values (email is optional)
        const trimmedUsername = username ? username.trim() : '';
        const trimmedRole = role ? role.trim() : '';
        const trimmedPassword = password ? password.trim() : '';
        const trimmedFullName = fullName ? fullName.trim() : '';
        
        console.log('Trimmed fields:', {
            username: `"${trimmedUsername}"`,
            role: `"${trimmedRole}"`,
            password: trimmedPassword ? '[PROVIDED]' : '[EMPTY]',
            fullName: `"${trimmedFullName}"`
        });
        
        if (!trimmedUsername || !trimmedRole || !trimmedPassword || !trimmedFullName) {
            console.log('Validation failed - missing required fields');
            const missingFields = [];
            if (!trimmedUsername) missingFields.push('Username');
            if (!trimmedRole) missingFields.push('Role');
            if (!trimmedPassword) missingFields.push('Password');
            if (!trimmedFullName) missingFields.push('Full Name');
            
            return res.render('users/add', {
                title: 'Add New User',
                user: req.session.user,
                error: `Required fields missing: ${missingFields.join(', ')}. Email is optional.`,
                formData: req.body
            });
        }
        
        // Get all users for validation and user ID generation
        const users = await dataManager.getUsers();
        
        // Check if username already exists or email exists (if email is provided)
        const trimmedEmail = email ? email.trim() : '';
        const existingUser = users.find(u => 
            u.username === trimmedUsername || 
            (trimmedEmail && u.email === trimmedEmail)
        );
        if (existingUser) {
            const errorMessage = existingUser.username === trimmedUsername ? 
                'Username already exists' : 
                'Email already exists';
            return res.render('users/add', {
                title: 'Add New User',
                user: req.session.user,
                error: errorMessage,
                formData: req.body
            });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
        
        // Generate new user ID
        const maxId = users.length > 0 ? Math.max(...users.map(u => parseInt(u.id.split('_')[1]))) : 0;
        const newId = `user_${String(maxId + 1).padStart(3, '0')}`;
        
        // Create new user
        const newUser = {
            id: newId,
            username: trimmedUsername,
            email: trimmedEmail,
            fullName: trimmedFullName,
            role: trimmedRole,
            password: hashedPassword,
            status: status || 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastLogin: null,
            isActive: status !== 'inactive'
        };
        
        users.push(newUser);
        await dataManager.saveUsers(users);
        
        res.redirect('/users?success=User created successfully');
        
    } catch (error) {
        console.error('Error creating user:', error);
        res.render('users/add', {
            title: 'Add New User',
            user: req.session.user,
            error: 'Failed to create user',
            formData: req.body
        });
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
        const { username, email, role, password, fullName, status } = req.body;
        
        console.log('Edit user data received:', {
            username: `"${username}"`,
            email: `"${email}"`,
            role: `"${role}"`,
            password: password ? '[PROVIDED]' : '[EMPTY]',
            fullName: `"${fullName}"`,
            status: `"${status}"`
        });
        
        // Validation - email is optional
        const trimmedUsername = username ? username.trim() : '';
        const trimmedRole = role ? role.trim() : '';
        const trimmedFullName = fullName ? fullName.trim() : '';
        const trimmedEmail = email ? email.trim() : '';
        
        console.log('Edit trimmed fields:', {
            username: `"${trimmedUsername}"`,
            role: `"${trimmedRole}"`,
            fullName: `"${trimmedFullName}"`,
            email: `"${trimmedEmail}"`
        });
        
        if (!trimmedUsername || !trimmedRole || !trimmedFullName) {
            // Get the user data to re-render the form
            const users = await dataManager.getUsers();
            const editUser = users.find(u => u.id === userId);
            return res.render('users/edit', {
                title: 'Edit User',
                user: req.session.user,
                editUser: editUser,
                error: 'Username, role, and full name are required'
            });
        }
        
        const users = await dataManager.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        
        if (userIndex === -1) {
            return res.redirect('/users?error=User not found');
        }
        
        // Check if username/email already exists (excluding current user)
        const existingUser = users.find(u => 
            u.id !== userId && (
                u.username === trimmedUsername || 
                (trimmedEmail && u.email === trimmedEmail)
            )
        );
        if (existingUser) {
            const errorMessage = existingUser.username === trimmedUsername ? 
                'Username already exists' : 
                'Email already exists';
            const editUser = users.find(u => u.id === userId);
            return res.render('users/edit', {
                title: 'Edit User',
                user: req.session.user,
                editUser: editUser,
                error: errorMessage
            });
        }
        
        // Update user data
        users[userIndex].username = trimmedUsername;
        users[userIndex].email = trimmedEmail;
        users[userIndex].fullName = trimmedFullName;
        users[userIndex].role = trimmedRole;
        users[userIndex].status = status || 'active';
        users[userIndex].isActive = status !== 'inactive';
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
