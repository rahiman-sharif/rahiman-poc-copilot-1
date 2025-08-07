// Simple test to check settings access after login
const http = require('http');
const querystring = require('querystring');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', (e) => {
            reject(e);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function testSettingsAccess() {
    try {
        console.log('🧪 Testing settings access...');
        
        // Test 1: Access settings without login (should redirect)
        console.log('\n1. Testing /settings without login...');
        const settingsWithoutLogin = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/settings',
            method: 'GET'
        });
        console.log(`   Status: ${settingsWithoutLogin.statusCode}`);
        console.log(`   Location: ${settingsWithoutLogin.headers.location || 'None'}`);
        
        // Test 2: Access login page
        console.log('\n2. Testing /login page...');
        const loginPage = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/login',
            method: 'GET'
        });
        console.log(`   Status: ${loginPage.statusCode}`);
        
        // Test 3: Check if /dashboard works (this would indicate if the app is working)
        console.log('\n3. Testing /dashboard (should redirect to login)...');
        const dashboard = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/dashboard',
            method: 'GET'
        });
        console.log(`   Status: ${dashboard.statusCode}`);
        console.log(`   Location: ${dashboard.headers.location || 'None'}`);
        
        console.log('\n✅ Test completed. Check server logs for debug information.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testSettingsAccess();
