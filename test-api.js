const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/homepage/template',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response received successfully');
    console.log(`Response data: ${data}`);
  });
});

req.on('error', (e) => {
  console.error(`Error: ${e.message}`);
});

req.end();