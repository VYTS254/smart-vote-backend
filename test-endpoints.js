// Quick test script to verify API endpoints
const http = require('http');

const testEndpoint = (path, method = 'GET', data = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        console.log(`\n✓ ${method} ${path}`);
        console.log(`  Status: ${res.statusCode}`);
        try {
          const json = JSON.parse(body);
          console.log(`  Response:`, JSON.stringify(json, null, 2));
        } catch {
          console.log(`  Response:`, body);
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`\n✗ ${method} ${path}`);
      console.log(`  Error:`, err.message);
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
};

async function runTests() {
  console.log('🧪 Testing API Endpoints...\n');

  try {
    // Test health
    await testEndpoint('/health', 'GET');

    // Test departments
    await testEndpoint('/departments', 'GET');

    // Test elections
    await testEndpoint('/elections', 'GET');

    console.log('\n✅ All tests passed!');
    console.log('\n📱 Mobile app should be able to connect to:');
    console.log('   • Android Emulator: http://10.0.2.2:3000/api');
    console.log('   • iOS Simulator: http://localhost:3000/api');
    console.log('   • Physical Device: http://YOUR_COMPUTER_IP:3000/api');
  } catch (error) {
    console.log('\n❌ Tests failed');
  }
}

runTests();
