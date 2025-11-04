#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('=== Directory Structure Check ===');
console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

function checkDirectory(dirPath, name) {
    console.log(`\n--- Checking ${name} ---`);
    console.log('Path:', dirPath);
    try {
        if (fs.existsSync(dirPath)) {
            console.log('✅ Directory exists');
            const stats = fs.statSync(dirPath);
            console.log('Is directory:', stats.isDirectory());
            
            if (stats.isDirectory()) {
                const contents = fs.readdirSync(dirPath);
                console.log('Contents:', contents.slice(0, 10)); // First 10 items
                if (contents.length > 10) {
                    console.log(`... and ${contents.length - 10} more items`);
                }
            }
        } else {
            console.log('❌ Directory does not exist');
        }
    } catch (error) {
        console.log('❌ Error checking directory:', error.message);
    }
}

// Check current directory
checkDirectory('.', 'Current Directory');

// Check frontend directory
checkDirectory('./frontend', 'Frontend Directory');
checkDirectory(path.join(__dirname, 'frontend'), 'Frontend Directory (absolute)');

// Check backend directory
checkDirectory('./backend', 'Backend Directory');

// Check if package.json exists in root and frontend
console.log('\n--- Package.json Check ---');
['.', './frontend', './backend'].forEach(dir => {
    const packagePath = path.join(dir, 'package.json');
    console.log(`${packagePath}: ${fs.existsSync(packagePath) ? '✅ exists' : '❌ missing'}`);
});

console.log('\n=== Environment Info ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RAILWAY_ENVIRONMENT:', process.env.RAILWAY_ENVIRONMENT);
console.log('Platform:', process.platform);