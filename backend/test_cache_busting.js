#!/usr/bin/env node

// Test script to verify cache-busting mechanisms
const http = require('http');

const testUrls = [
  'http://localhost:5173/frontend_dashboard_visual_editor_single_file_html.html',
  'http://localhost:5173/control-panel.html',
  'http://localhost:5173/backend-dashboard.html',
  'http://localhost:5173/middleware-dashboard.html'
];

console.log('🧪 Testing cache-busting mechanisms...\n');

testUrls.forEach((url, index) => {
  const testUrl = url + '?v=' + Date.now();
  
  http.get(testUrl, (res) => {
    console.log(`✅ ${index + 1}. ${url}`);
    console.log(`   Status: ${res.statusCode}`);
    console.log(`   Cache-Control: ${res.headers['cache-control'] || 'Not set'}`);
    console.log(`   Pragma: ${res.headers['pragma'] || 'Not set'}`);
    console.log(`   Test URL: ${testUrl}\n`);
  }).on('error', (err) => {
    console.log(`❌ ${index + 1}. ${url}`);
    console.log(`   Error: ${err.message}\n`);
  });
});

console.log('💡 To test manually:');
console.log('1. Open any dashboard URL');
console.log('2. Add ?v=1, ?v=2, etc. to force fresh loads');
console.log('3. Use Ctrl+Shift+R for hard refresh');
console.log('4. Check browser DevTools → Network → Disable cache');
