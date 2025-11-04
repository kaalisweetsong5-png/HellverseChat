#!/usr/bin/env node

console.log('🚀 HellverseChat Startup Script');
console.log('==============================');

// Environment debug info
console.log('Environment Info:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- PORT:', process.env.PORT || 'undefined (will use 4000)');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'undefined');
console.log('- Working Directory:', process.cwd());
console.log('- Node Version:', process.version);

// Check critical files
const fs = require('fs');
const path = require('path');

console.log('\nFile System Check:');
console.log('- Current directory contents:');
try {
  const files = fs.readdirSync('.');
  files.forEach(file => {
    const stat = fs.statSync(file);
    console.log(`  ${stat.isDirectory() ? '📁' : '📄'} ${file}`);
  });
} catch (error) {
  console.log('  Error reading directory:', error.message);
}

console.log('\n- Backend directory check:');
try {
  if (fs.existsSync('./backend')) {
    console.log('  ✅ Backend directory exists');
    const backendFiles = fs.readdirSync('./backend');
    backendFiles.forEach(file => {
      console.log(`    📄 ${file}`);
    });
  } else {
    console.log('  ❌ Backend directory missing');
  }
} catch (error) {
  console.log('  Error checking backend:', error.message);
}

console.log('\n- Frontend build check:');
try {
  if (fs.existsSync('./frontend/dist')) {
    console.log('  ✅ Frontend dist exists');
    const distFiles = fs.readdirSync('./frontend/dist');
    console.log(`  📄 Files: ${distFiles.join(', ')}`);
  } else {
    console.log('  ❌ Frontend dist missing - will need to build');
  }
} catch (error) {
  console.log('  Error checking frontend:', error.message);
}

// Set default environment variables if missing
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key-change-me-in-production';

console.log('\n🔄 Starting backend server...');

// Start the actual server with ES module support
try {
  import('./backend/server.js').then(() => {
    console.log('✅ Server module loaded successfully');
  }).catch(error => {
    console.error('❌ Failed to import server module:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('Error stack:', error.stack);
  process.exit(1);
}