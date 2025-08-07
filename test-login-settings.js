// Comprehensive test with actual login simulation
const http = require('http');
const querystring = require('querystring');

function makeRequest(options, postData = null, cookies = null) {
    return new Promise((resolve, reject) => {
        if (cookies) {
            options.headers = options.headers || {};
            options.headers.Cookie = cookies;
        }
        
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data,
                    cookies: res.headers['set-cookie']
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

async function testLoginAndSettings() {
    try {
        console.log('🧪 Testing login flow and settings access...');
        
        // Step 1: Get login page (to establish session)
        console.log('\n1. Getting login page...');
        const loginPage = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/login',
            method: 'GET'
        });
        console.log(`   Status: ${loginPage.statusCode}`);
        
        // Extract session cookie
        let sessionCookie = null;
        if (loginPage.cookies) {
            sessionCookie = loginPage.cookies.find(cookie => cookie.startsWith('connect.sid'));
        }
        console.log(`   Session cookie: ${sessionCookie ? 'Found' : 'Not found'}`);
        
        // Step 2: Attempt login
        console.log('\n2. Attempting login...');
        const loginData = querystring.stringify({
            username: 'admin',
            password: 'admin123'
        });
        
        const loginResult = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(loginData)
            }
        }, loginData, sessionCookie);
        
        console.log(`   Login status: ${loginResult.statusCode}`);
        console.log(`   Redirect location: ${loginResult.headers.location || 'None'}`);
        
        // Update session cookie if new one provided
        if (loginResult.cookies) {
            const newSessionCookie = loginResult.cookies.find(cookie => cookie.startsWith('connect.sid'));
            if (newSessionCookie) {
                sessionCookie = newSessionCookie;
            }
        }
        
        // Step 3: Try accessing settings with authenticated session
        console.log('\n3. Accessing settings after login...');
        const settingsResult = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/settings',
            method: 'GET'
        }, null, sessionCookie);
        
        console.log(`   Settings status: ${settingsResult.statusCode}`);
        if (settingsResult.statusCode === 302) {
            console.log(`   Redirect location: ${settingsResult.headers.location || 'None'}`);
        } else if (settingsResult.statusCode === 200) {
            console.log(`   ✅ Settings page loaded successfully!`);
        } else {
            console.log(`   ❌ Unexpected status code`);
        }
        
        console.log('\n✅ Test completed. Check server logs for any debug output.');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testLoginAndSettings();
