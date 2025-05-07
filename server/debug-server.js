/**
 * Debug Server for Heroku
 * 
 * A simplified server to run on Heroku for testing basic functionality
 */

require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

// Basic middleware
app.use(express.json());

// Add error handling middleware
app.use((err, req, res, next) => {
  console.error('Application error:', err);
  res.status(500).json({
    error: 'An unexpected error occurred',
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    node_version: process.version
  });
});

// Environment info route
app.get('/env', (req, res) => {
  // Only show this in non-production environments
  if (process.env.NODE_ENV === 'production') {
    return res.json({ 
      message: 'Environment info not available in production',
      environment: process.env.NODE_ENV
    });
  }
  
  // Show safe environment variables
  res.json({
    environment: process.env.NODE_ENV,
    port: process.env.PORT,
    host: process.env.HOST,
    node_version: process.version,
    scopes: process.env.SCOPES
  });
});

// Test MongoDB connection
app.get('/test-db', async (req, res) => {
  try {
    const database = require('../src/services/database');
    const db = await database.connectToDatabase();
    
    if (!db) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to connect to MongoDB, using in-memory storage'
      });
    }
    
    res.json({
      status: 'ok',
      message: 'Connected to MongoDB successfully',
      database: process.env.MONGODB_DB_NAME
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to MongoDB',
      error: error.message
    });
  }
});

// Root path
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Meta Maximus - Debug Mode</title>
        <style>
          body { font-family: -apple-system, sans-serif; margin: 20px; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; }
          h1 { color: #5c6ac4; }
          .btn { display: inline-block; padding: 10px 15px; background: #5c6ac4; color: white; 
                text-decoration: none; border-radius: 4px; margin-right: 10px; margin-bottom: 10px; }
          .card { background: #f9fafb; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Meta Maximus - Debug Mode</h1>
          <div class="card">
            <p>This is a debug server for troubleshooting Heroku deployment issues.</p>
            <p>App Environment: ${process.env.NODE_ENV || 'development'}</p>
            <p>Node Version: ${process.version}</p>
          </div>
          
          <h2>Test Endpoints</h2>
          <div>
            <a href="/health" class="btn">Health Check</a>
            <a href="/test-db" class="btn">Test Database</a>
            <a href="/env" class="btn">Environment Info</a>
          </div>
          
          <h2>Shopify Auth</h2>
          <div class="card">
            <p>To test Shopify authentication with limited scopes:</p>
            <a href="/auth-test?shop=metamaximus.myshopify.com" class="btn">Test Auth</a>
          </div>
        </div>
      </body>
    </html>
  `);
});

// Simple auth test endpoint
app.get('/auth-test', (req, res) => {
  const shop = req.query.shop;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }
  
  res.send(`
    <html>
      <head>
        <title>Auth Test</title>
        <style>
          body { font-family: -apple-system, sans-serif; margin: 20px; line-height: 1.5; }
          .container { max-width: 800px; margin: 0 auto; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Auth Test</h1>
          <p>Shop: ${shop}</p>
          <p>Requested Scopes: ${process.env.SCOPES}</p>
          
          <h2>Environment Variables</h2>
          <pre>
HOST: ${process.env.HOST || 'Not set'}
NODE_ENV: ${process.env.NODE_ENV || 'Not set'}
SHOPIFY_API_KEY: ${process.env.SHOPIFY_API_KEY ? '******' : 'Not set'}
SHOPIFY_API_SECRET: ${process.env.SHOPIFY_API_SECRET ? '******' : 'Not set'}
          </pre>
          
          <p>This is a test page for debugging OAuth issues. The actual OAuth flow is not initiated here.</p>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(port, () => {
  console.log(`Debug server listening at http://localhost:${port}`);
});