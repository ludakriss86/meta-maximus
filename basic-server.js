// Extremely Simple Express Server for Heroku
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Get and check environment variables
const nodeEnv = process.env.NODE_ENV || 'development';
const hostName = process.env.HOST || 'not set';
const hasShopifyConfig = process.env.SHOPIFY_API_KEY && process.env.SHOPIFY_API_SECRET;
const scopes = process.env.SCOPES || 'not set';

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: nodeEnv,
    host: hostName,
    hasShopifyConfig: hasShopifyConfig,
    scopes: scopes
  });
});

// Root path
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Meta Maximus - Minimal Server</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 20px; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #5c6ac4; }
          pre { background: #f4f6f8; padding: 10px; border-radius: 4px; overflow: auto; }
          .status { margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; }
          .btn { display: inline-block; margin-top: 10px; padding: 8px 16px; background: #5c6ac4; color: white; text-decoration: none; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Meta Maximus - Minimal Server</h1>
          <div class="status">
            <p><strong>Server Status:</strong> Running</p>
            <p><strong>App Environment:</strong> ${nodeEnv}</p>
            <p><strong>Host:</strong> ${hostName}</p>
            <p><strong>Node Version:</strong> ${process.version}</p>
            <p><strong>Shopify Config:</strong> ${hasShopifyConfig ? 'Available' : 'Missing'}</p>
            <p><strong>Scopes:</strong> ${scopes}</p>
          </div>
          <a href="/health" class="btn">View Health Check</a>
        </div>
      </body>
    </html>
  `);
});

// Catch-all route for debugging
app.use((req, res) => {
  res.send(`
    <html>
      <head>
        <title>Route Not Found</title>
        <style>
          body { font-family: system-ui, sans-serif; margin: 20px; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; padding: 20px; }
          h1 { color: #bf0711; }
          pre { background: #f4f6f8; padding: 10px; border-radius: 4px; overflow: auto; }
          .back { display: inline-block; margin-top: 20px; color: #5c6ac4; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Route Not Found</h1>
          <p>The requested URL "${req.url}" was not found on this server.</p>
          <p>Request details:</p>
          <pre>
Method: ${req.method}
Path: ${req.path}
Query: ${JSON.stringify(req.query, null, 2)}
          </pre>
          <a href="/" class="back">← Back to Home</a>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Minimal server started on port ${port}`);
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Host: ${hostName}`);
});