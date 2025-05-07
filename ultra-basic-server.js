// Ultra-simplified Express server for debugging Heroku issues
const express = require('express');
const app = express();

// Get port from environment or use default
const port = process.env.PORT || 3001;

// Root path
app.get('/', (req, res) => {
  // Collect environment info
  const env = {
    PORT: process.env.PORT || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set',
    HOST: process.env.HOST || 'not set',
    HAS_SHOPIFY_CONFIG: Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
    SCOPES: process.env.SCOPES || 'not set',
    NODE_VERSION: process.version,
    TIMESTAMP: new Date().toISOString()
  };

  // Send a simple HTML response
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Meta Maximus - Debug Server</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; }
        h1 { color: #5c6ac4; }
        pre { background: #f4f6f8; padding: 15px; border-radius: 4px; overflow: auto; }
      </style>
    </head>
    <body>
      <h1>Meta Maximus - Debug Server</h1>
      <p>This is a minimal debug server for testing Heroku deployment.</p>
      <h2>Environment Information:</h2>
      <pre>${JSON.stringify(env, null, 2)}</pre>
    </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Ultra-basic debug server started on port ${port}`);
});