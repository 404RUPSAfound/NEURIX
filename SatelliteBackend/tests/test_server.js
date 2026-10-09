const http = require('http');
const app = require('../app');

const server = app.listen(3002, () => {
  console.log('Test server running on port 3002');
  
  http.get('http://localhost:3002/health', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log('Health check response:', data);
      const parsed = JSON.parse(data);
      if (parsed.status === 'operational') {
        console.log('✅ SATELLITE BACKEND HEALTH CHECK PASSED');
        server.close(() => process.exit(0));
      } else {
        console.error('❌ SATELLITE BACKEND HEALTH CHECK FAILED');
        server.close(() => process.exit(1));
      }
    });
  }).on('error', (err) => {
    console.error('Error during health check:', err);
    server.close(() => process.exit(1));
  });
});
