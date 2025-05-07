const http = require('http');

// Test port 3001
testPort(3001);

// Test port 3001 again to make sure it's working
testPort(3001);

function testPort(port) {
  const options = {
    hostname: 'localhost',
    port: port,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`PORT ${port} - STATUS: ${res.statusCode}`);
    console.log(`PORT ${port} - HEADERS: ${JSON.stringify(res.headers)}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`PORT ${port} - Response received successfully`);
    });
  });

  req.on('error', (e) => {
    console.error(`PORT ${port} - Error: ${e.message}`);
  });

  req.end();
}