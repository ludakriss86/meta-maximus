// Simple OAuth test server for debugging Shopify integration
const express = require('express');
const app = express();

// Get port from environment or use default
const port = process.env.PORT || 3001;

// Display environment variables
const getEnvInfo = () => ({
  PORT: process.env.PORT || 'not set',
  NODE_ENV: process.env.NODE_ENV || 'not set',
  HOST: process.env.HOST || 'not set',
  HAS_SHOPIFY_CONFIG: Boolean(process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET),
  SCOPES: process.env.SCOPES || 'not set',
  NODE_VERSION: process.version,
  TIMESTAMP: new Date().toISOString()
});

// Root path
app.get('/', (req, res) => {
  const env = getEnvInfo();

  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Meta Maximus - OAuth Test</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; }
        h1 { color: #5c6ac4; }
        pre { background: #f4f6f8; padding: 15px; border-radius: 4px; overflow: auto; }
        .btn { display: inline-block; margin: 10px 0; padding: 10px 15px; background: #5c6ac4; color: white; text-decoration: none; border-radius: 4px; }
      </style>
    </head>
    <body>
      <h1>Meta Maximus - OAuth Test</h1>
      <p>This is a server for testing Shopify OAuth integration.</p>
      
      <h2>Environment Information:</h2>
      <pre>${JSON.stringify(env, null, 2)}</pre>
      
      <h2>Test OAuth Flow:</h2>
      <a href="/auth?shop=metamaximus.myshopify.com" class="btn">Test OAuth</a>
    </body>
    </html>
  `);
});

// Simple auth route that shows the request parameters
app.get('/auth', (req, res) => {
  const shop = req.query.shop;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }
  
  // Show the auth parameters that would be used
  const authParams = {
    shop,
    apiKey: process.env.SHOPIFY_API_KEY ? process.env.SHOPIFY_API_KEY.substring(0, 4) + '...' : 'not set',
    scopes: process.env.SCOPES,
    redirectUri: `https://${process.env.HOST}/auth/callback`,
    nonce: 'mock_nonce_' + Date.now()
  };
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Auth Test - ${shop}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; }
        h1 { color: #5c6ac4; }
        pre { background: #f4f6f8; padding: 15px; border-radius: 4px; overflow: auto; }
        .back { display: inline-block; margin-top: 20px; color: #5c6ac4; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>OAuth Test for ${shop}</h1>
      <p>This shows the parameters that would be used to redirect to Shopify's OAuth page.</p>
      
      <h2>Auth Parameters:</h2>
      <pre>${JSON.stringify(authParams, null, 2)}</pre>
      
      <h2>What would happen next:</h2>
      <p>In a real implementation, you would be redirected to Shopify's OAuth page with these parameters.</p>
      <p>After authorization, Shopify would redirect back to your callback URL with a code that can be exchanged for an access token.</p>
      
      <a href="/" class="back">← Back to Home</a>
    </body>
    </html>
  `);
});

// Auth callback route
app.get('/auth/callback', (req, res) => {
  // Show what would happen in the callback
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Auth Callback</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; }
        h1 { color: #5c6ac4; }
        pre { background: #f4f6f8; padding: 15px; border-radius: 4px; overflow: auto; }
        .back { display: inline-block; margin-top: 20px; color: #5c6ac4; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>Auth Callback</h1>
      <p>This is where Shopify would redirect after OAuth authorization.</p>
      
      <h2>Request Query Parameters:</h2>
      <pre>${JSON.stringify(req.query, null, 2)}</pre>
      
      <a href="/" class="back">← Back to Home</a>
    </body>
    </html>
  `);
});

// Simple 404 handler
app.use((req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Not Found</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; }
        h1 { color: #bf0711; }
        .back { display: inline-block; margin-top: 20px; color: #5c6ac4; text-decoration: none; }
      </style>
    </head>
    <body>
      <h1>404 - Not Found</h1>
      <p>The requested URL "${req.url}" was not found on this server.</p>
      <a href="/" class="back">← Back to Home</a>
    </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`OAuth test server started on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Host: ${process.env.HOST}`);
});