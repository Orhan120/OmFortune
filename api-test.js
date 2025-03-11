
const fetch = require('node-fetch');

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const TESTS = [
  { name: 'Health Check', endpoint: '/health', method: 'GET' },
  { name: 'API Documentation', endpoint: '/api', method: 'GET' },
  { name: 'Get Visitors', endpoint: '/visitors', method: 'GET' },
  { name: 'Record Visitor', endpoint: '/visitors', method: 'POST', body: {} },
  { 
    name: 'Create Fortune', 
    endpoint: '/fortunes', 
    method: 'POST', 
    body: {
      name: 'Test User',
      zodiac: 'Libra',
      fortune: 'You will have a great day!',
      deviceInfo: {
        browser: 'Test Browser',
        os: 'Test OS',
        isMobile: false
      }
    } 
  },
  { name: 'Get Fortunes', endpoint: '/fortunes', method: 'GET' },
  { name: 'Get Daily Stats', endpoint: '/stats/daily', method: 'GET' }
];

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Run tests
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}=== OmFortune API Tests ===${colors.reset}\n`);
  
  for (const test of TESTS) {
    try {
      const url = test.endpoint.startsWith('/') 
        ? `${API_BASE_URL}${test.endpoint}` 
        : `${API_BASE_URL}/${test.endpoint}`;
      
      console.log(`${colors.bright}Testing: ${colors.yellow}${test.name}${colors.reset}`);
      console.log(`${colors.dim}${test.method} ${url}${colors.reset}`);
      
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
        console.log(`${colors.dim}Body: ${JSON.stringify(test.body, null, 2)}${colors.reset}`);
      }
      
      const response = await fetch(url, options);
      const data = await response.json();
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`${colors.green}✓ Success!${colors.reset}`);
      } else {
        console.log(`${colors.red}✗ Failed: ${data.error || 'Unknown error'}${colors.reset}`);
      }
      
      console.log('Response:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
    }
    
    console.log('\n---\n');
  }
  
  console.log(`${colors.bright}${colors.cyan}=== Tests Complete ===${colors.reset}`);
}

runTests();
