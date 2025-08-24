#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Setting up logo integration for executable builds...\n');

// Check if rcedit is available
function checkRcedit() {
    return new Promise((resolve) => {
        const rcedit = spawn('rcedit', ['--help'], { stdio: 'pipe', shell: true });
        
        rcedit.on('close', (code) => {
            resolve(code === 0);
        });
        
        rcedit.on('error', () => {
            resolve(false);
        });
    });
}

// Install rcedit
function installRcedit() {
    return new Promise((resolve) => {
        console.log('📦 Installing rcedit...');
        const npm = spawn('npm', ['install', '-g', 'rcedit'], { 
            stdio: 'inherit', 
            shell: true 
        });
        
        npm.on('close', (code) => {
            resolve(code === 0);
        });
    });
}

// Check logo files
function checkLogo() {
    const logoPath = path.join(__dirname, 'assets', 'logo.png');
    const publicLogoPath = path.join(__dirname, 'public', 'images', 'logo.png');
    
    if (fs.existsSync(logoPath)) {
        console.log('✅ Logo found in assets/logo.png');
        return true;
    } else if (fs.existsSync(publicLogoPath)) {
        console.log('📁 Logo found in public/images/logo.png');
        console.log('🔄 Copying to assets/logo.png...');
        
        // Ensure assets directory exists
        const assetsDir = path.join(__dirname, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        try {
            fs.copyFileSync(publicLogoPath, logoPath);
            console.log('✅ Logo copied to assets/logo.png');
            return true;
        } catch (error) {
            console.log('⚠️ Could not copy logo:', error.message);
            return false;
        }
    } else {
        console.log('⚠️ No logo file found');
        console.log('💡 Please place your logo as:');
        console.log('   • assets/logo.png (recommended)');
        console.log('   • public/images/logo.png');
        return false;
    }
}

// Main setup function
async function setup() {
    console.log('🔍 Checking rcedit availability...');
    const rceditAvailable = await checkRcedit();
    
    if (!rceditAvailable) {
        console.log('❌ rcedit not found');
        const installed = await installRcedit();
        
        if (installed) {
            console.log('✅ rcedit installed successfully!');
        } else {
            console.log('⚠️ Could not install rcedit automatically');
            console.log('💡 Manual installation: npm install -g rcedit');
        }
    } else {
        console.log('✅ rcedit is available');
    }
    
    console.log('\n🖼️ Checking logo files...');
    const logoAvailable = checkLogo();
    
    console.log('\n🎉 Setup Summary:');
    console.log(`   • rcedit: ${rceditAvailable || 'installed' ? '✅' : '⚠️'}`);
    console.log(`   • Logo: ${logoAvailable ? '✅' : '⚠️'}`);
    
    if (logoAvailable) {
        console.log('\n🚀 Ready to build executable with logo!');
        console.log('Run: npm run createexe');
    } else {
        console.log('\n📝 Next steps:');
        console.log('1. Add your logo to assets/logo.png');
        console.log('2. Run: npm run createexe');
    }
}

setup().catch(console.error);
