// Middleware to check route permissions
const fs = require('fs');
const path = require('path');
const pathManager = require('../utils/path-manager');

function loadRoutePermissions() {
    try {
        const permissionsPath = path.join(pathManager.getDataPath(), 'route-permissions.json');
        const data = fs.readFileSync(permissionsPath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.warn('Route permissions file not found, allowing all routes');
        return { permissions: {} };
    }
}

function checkRoutePermission(req, res, next) {
    console.log(`🚀 MIDDLEWARE CALLED FOR: ${req.path}`);
    
    // Super users always have access to all routes
    if (req.session.user && req.session.user.role === 'super') {
        return next();
    }

    const permissions = loadRoutePermissions();
    const currentPath = req.path;
    
    console.log(`🛣️ Checking route permission for: ${currentPath}`);
    
    // Find if this route is controlled
    let isRouteControlled = false;
    let routeEnabled = true;

    for (const groupKey in permissions.permissions) {
        for (const routePath in permissions.permissions[groupKey]) {
            console.log(`🔍 Checking route ${routePath} in group ${groupKey}`);
            
            // Check for exact match first
            if (currentPath === routePath) {
                isRouteControlled = true;
                const routeData = permissions.permissions[groupKey][routePath];
                routeEnabled = routeData.enabled;
                console.log(`🎯 Exact match: ${currentPath} found in ${groupKey}, enabled: ${routeEnabled}`);
                break;
            }
            
            // Check for dynamic routes (e.g., /items/:id/edit matches /items/item_001/edit)
            if (routePath.includes(':')) {
                const routePattern = routePath.replace(/:[^\/]+/g, '[^/]+');
                const regex = new RegExp(`^${routePattern}$`);
                console.log(`🔧 Testing pattern: ${routePath} -> ${routePattern} against ${currentPath}`);
                
                if (regex.test(currentPath)) {
                    isRouteControlled = true;
                    const routeData = permissions.permissions[groupKey][routePath];
                    routeEnabled = routeData.enabled;
                    console.log(`🎯 Dynamic match: ${currentPath} matches pattern ${routePath} in ${groupKey}, enabled: ${routeEnabled}`);
                    break;
                } else {
                    console.log(`❌ No match for pattern ${routePath}`);
                }
            }
        }
        if (isRouteControlled) break;
    }

    // If route is controlled and disabled, redirect to placeholder
    if (isRouteControlled && !routeEnabled) {
        console.log(`🚫 Blocking access to disabled route: ${currentPath}`);
        return res.render('placeholder/coming-soon', {
            title: 'Feature Coming Soon',
            routePath: currentPath,
            user: req.session.user,
            company: res.locals.company || {}
        });
    }

    console.log(`✅ Allowing access to route: ${currentPath}`);
    next();
}

module.exports = { checkRoutePermission, loadRoutePermissions };
