#!/usr/bin/env node

/**
 * Test script to verify all settings routes are working
 * Run this after the server is started to test the settings module
 */

const axios = require('axios').default;

const baseUrl = 'http://localhost:3000';
const testRoutes = [
    '/settings',
    '/settings/tax',
    '/settings/invoice',
    '/settings/business',
    '/settings/security',
    '/settings/integration',
    '/settings/application',
    '/settings/users/user_001/edit'
];

async function testRoute(route) {
    try {
        const response = await axios.get(baseUrl + route, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Accept redirects too
            }
        });
        
        if (response.status === 302) {
            console.log(`✅ ${route} - Redirects (authentication required)`);
        } else {
            console.log(`✅ ${route} - Status: ${response.status}`);
        }
        return true;
    } catch (error) {
        if (error.response && error.response.status === 302) {
            console.log(`✅ ${route} - Redirects (authentication required)`);
            return true;
        }
        console.log(`❌ ${route} - Error: ${error.message}`);
        return false;
    }
}

async function runTests() {
    console.log('🧪 Testing Settings Routes...\n');
    
    let passedTests = 0;
    
    for (const route of testRoutes) {
        const result = await testRoute(route);
        if (result) passedTests++;
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    
    console.log(`\n📊 Test Results: ${passedTests}/${testRoutes.length} routes working`);
    
    if (passedTests === testRoutes.length) {
        console.log('🎉 All settings routes are working correctly!');
    } else {
        console.log('⚠️  Some routes may need attention');
    }
}

// Run the tests
runTests().catch(console.error);
