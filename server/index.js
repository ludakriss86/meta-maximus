require('dotenv').config();
// Import the adapter before anything else
require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { shopifyApi, ApiVersion, LATEST_API_VERSION } = require('@shopify/shopify-api');
const path = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const config = require('../src/config');
const scheduler = require('../src/services/scheduler');

const app = express();
const port = config.PORT; // Consistent port usage from config

// Initialize Shopify API with detailed logging
console.log(`Initializing Shopify API with:
  - API Version: ${LATEST_API_VERSION}
  - Host: ${process.env.HOST || `localhost:${port}`}
  - Scopes: ${process.env.SCOPES}
  - Environment: ${process.env.NODE_ENV}
`);

// Ensure scopes are properly formatted and trimmed
// Use default scopes if none provided
const defaultScopes = 'write_products,read_products,read_content,write_content';
const scopesString = process.env.SCOPES || defaultScopes;
const formattedScopes = scopesString.split(',').map(scope => scope.trim());
console.log('Formatted scopes:', formattedScopes);

const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: formattedScopes,
  hostName: process.env.HOST || `localhost:${port}`,
  hostScheme: 'https',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  logger: {
    log: (severity, message) => {
      console.log(`[Shopify ${severity}]: ${message}`);
    }
  }
});

// Middleware
app.use(express.json());
app.use(cookieParser(shopify.config.apiSecretKey));

// Serve static assets from the public folder
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory session storage (for development)
const SESSION_STORAGE = new Map();

// Generate a random nonce for OAuth
const generateNonce = () => crypto.randomBytes(16).toString('hex');

// Status route to check configuration
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV,
    shopify_api: {
      version: LATEST_API_VERSION,
      host: process.env.HOST,
      scopes: process.env.SCOPES.split(','),
      timestamp: new Date().toISOString()
    }
  });
});

// Auth route - starts OAuth process
app.get('/auth', async (req, res) => {
  let shop = req.query.shop;
  const host = req.query.host;
  
  // Explicitly preserve the host parameter throughout the auth flow
  const hostParam = host ? `&host=${encodeURIComponent(host)}` : '';
  
  // DETAILED DEBUG LOGGING
  console.log('\n================ AUTH ROUTE ACCESS ================');
  console.log('Time:', new Date().toISOString());
  console.log('Query Parameters:');
  console.log('- shop:', shop);
  console.log('- host:', host);
  console.log('Request Headers:');
  console.log('- User-Agent:', req.headers['user-agent']);
  console.log('- Referer:', req.headers['referer']);
  console.log('=================================================\n');
  
  if (!shop) {
    console.error('Missing shop parameter in auth route');
    return res.status(400).json({
      error: 'Missing shop parameter',
      message: 'A shop parameter is required to start the OAuth process'
    });
  }
  
  // Clean up shop parameter with robust formatting
  // First, ensure proper formatting of the shop name
  try {
    // Remove protocol if present (http:// or https://)
    shop = shop.replace(/^https?:\/\//, '');
    
    // Remove any trailing slash
    shop = shop.replace(/\/+$/, '');
    
    // Remove any path components (anything after the first slash)
    shop = shop.split('/')[0];
    
    // Ensure it ends with myshopify.com if it doesn't already
    if (!shop.includes('myshopify.com')) {
      if (!shop.includes('.')) {
        shop = `${shop}.myshopify.com`;
      } else {
        // If it has some domain but not myshopify.com, we need to validate
        const validDomain = shop.match(/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]\.[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+$/);
        if (!validDomain) {
          console.error('Invalid shop domain format:', shop);
          return res.status(400).json({
            error: 'Invalid shop domain',
            message: 'The provided shop domain is not valid. Please use your-store.myshopify.com format'
          });
        }
      }
    }
  } catch (error) {
    console.error('Error formatting shop parameter:', error);
    return res.status(400).json({
      error: 'Invalid shop parameter',
      message: 'The provided shop parameter could not be processed'
    });
  }
  
  console.log(`Processing auth for shop: ${shop}`);
  console.log(`Using scopes: ${formattedScopes.join(',')}`);
  
  // Generate nonce for security and store in cookie
  const nonce = generateNonce();
  console.log('Generated nonce for auth:', nonce.substring(0, 6) + '...');
  
  res.cookie('shopify_nonce', nonce, { 
    signed: true,
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  });
  
  try {
    // Validate required configuration
    if (!process.env.SHOPIFY_API_KEY || !process.env.SHOPIFY_API_SECRET) {
      throw new Error('Missing Shopify API credentials. Please check your environment variables.');
    }
    
    if (formattedScopes.length === 0) {
      throw new Error('No scopes defined. Please check your SCOPES environment variable.');
    }
    
    // Log auth details for debugging (with sensitive data protection)
    console.log('Auth configuration:', {
      apiKey: process.env.SHOPIFY_API_KEY ? `${process.env.SHOPIFY_API_KEY.substring(0, 4)}...` : 'missing',
      hasSecret: !!process.env.SHOPIFY_API_SECRET,
      scopes: formattedScopes,
      host: process.env.HOST,
      shop: shop
    });
    
    // Verify scopes are actually being passed to the auth.begin method
    console.log('Shopify API config scopes:', shopify.config.scopes);
    
    // Prepare options for auth.begin
    const authOptions = {
      shop,
      callbackPath: '/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    };
    
    // Add host if available to maintain embedded context
    if (host) {
      console.log('Using host in auth flow:', host);
      authOptions.callbackUrl = `https://${process.env.HOST}/auth/callback?host=${host}`;
    }
    
    console.log('Starting auth.begin with options:', JSON.stringify(authOptions, null, 2));
    
    // Begin OAuth flow and redirect to Shopify
    // The shopify.auth.begin method may handle the response itself
    const authUrl = await shopify.auth.begin(authOptions);
    
    console.log(`Generated auth URL: ${authUrl}`);
    
    // Only redirect if headers haven't been sent yet
    if (authUrl && !res.headersSent) {
      console.log('Redirecting to Shopify auth URL...');
      res.redirect(authUrl);
    } else {
      console.log('Headers already sent, not redirecting');
    }
  } catch (error) {
    console.error('Error starting OAuth process:', error);
    console.error('Error details:', error.stack);
    
    // Only send an error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).send(`
        <html>
          <head>
            <title>Auth Error</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; }
              h1 { color: #bf0711; }
              pre { background: #f4f6f8; padding: 15px; border-radius: 4px; overflow: auto; }
              .back { display: inline-block; margin-top: 20px; color: #5c6ac4; text-decoration: none; }
            </style>
          </head>
          <body>
            <h1>Authentication Error</h1>
            <p>There was a problem starting the authentication process:</p>
            <pre>${error.message}</pre>
            <p>Please check your environment variables and Shopify app configuration.</p>
            <a href="/" class="back">← Back to Home</a>
          </body>
        </html>
      `);
    } else {
      console.warn('Headers already sent, could not send error page to client');
    }
  }
});

// Auth callback route - completes OAuth process
app.get('/auth/callback', async (req, res) => {
  try {
    // DETAILED DEBUG LOGGING
    console.log('\n================ AUTH CALLBACK ACCESS ================');
    console.log('Time:', new Date().toISOString());
    console.log('Query Parameters:');
    const { shop, code, state, host } = req.query;
    console.log('- shop:', shop);
    console.log('- code:', code ? '[REDACTED]' : 'missing');
    console.log('- state:', state);
    console.log('- host:', host);
    console.log('Cookies:');
    console.log('- Has shopify_nonce cookie:', !!req.signedCookies.shopify_nonce);
    console.log('Request Headers:');
    console.log('- User-Agent:', req.headers['user-agent']);
    console.log('- Referer:', req.headers['referer']);
    console.log('- Cookie:', req.headers['cookie'] ? 'present' : 'missing');
    console.log('=================================================\n');
    
    // Validate that required query parameters are present
    if (!shop || !code) {
      console.error('Missing required callback parameters');
      return res.status(400).json({
        error: 'Invalid callback',
        message: 'Required parameters are missing from the callback'
      });
    }
    
    // Get nonce from cookie
    const nonce = req.signedCookies.shopify_nonce;
    console.log('Using nonce from cookie:', nonce ? `${nonce.substring(0, 6)}...` : 'missing');
    
    if (!nonce) {
      console.warn('No nonce found in cookies, this might be a security issue or a cookie problem');
      console.warn('Cookies in request:', JSON.stringify(req.cookies));
      console.warn('Signed cookies in request:', JSON.stringify(req.signedCookies));
    }
    
    // Complete OAuth process with enhanced logging
    console.log('Completing OAuth process...');
    try {
      // The Shopify auth.callback() method may handle the response automatically
      // We'll check if the response is already finished after the call
      console.log('Calling shopify.auth.callback()...');
      const session = await shopify.auth.callback({
        rawRequest: req,
        rawResponse: res,
      });
      
      // If Shopify has already sent a response, we should exit early
      if (res.headersSent) {
        console.log('Headers already sent by Shopify auth callback, skipping further processing');
        return;
      }
      
      if (!session || !session.shop) {
        console.error('Invalid or missing session data after OAuth callback');
        throw new Error('Invalid session returned from Shopify OAuth callback');
      }
      
      console.log('✅ OAuth successful!');
      console.log('Session details:');
      console.log('- Shop:', session.shop);
      console.log('- Scopes:', session.scope);
      console.log('- Expires:', session.expires ? new Date(session.expires).toISOString() : 'no expiry');
      console.log('- Is online:', session.isOnline);
      
      // Store session in MongoDB with better error handling
      try {
        const database = require('../src/services/database');
        
        // Check database connection before attempting to store
        if (database.isConnected()) {
          await database.storeSession(session);
          console.log('✅ Session stored in MongoDB successfully');
        } else {
          console.warn('⚠️ Database not connected for session storage');
          throw new Error('Database not connected');
        }
      } catch (dbError) {
        console.error('Error storing session in MongoDB:', dbError);
        
        // Fall back to in-memory storage
        const sessionKey = `${session.shop}_${session.isOnline ? 'online' : 'offline'}`;
        SESSION_STORAGE.set(sessionKey, session);
        console.log('⚠️ Session stored in memory as fallback');
        console.log(`Memory session storage contains ${SESSION_STORAGE.size} sessions`);
      }
      
      // If we get here and the response hasn't been sent yet, we can send our own response
      if (!res.headersSent) {
        // Clean up nonce with secure settings
        console.log('Clearing shopify_nonce cookie');
        res.clearCookie('shopify_nonce', {
          secure: process.env.NODE_ENV === 'production',
          httpOnly: true,
          sameSite: 'lax'
        });
        
        // For embedded apps, redirect back to Shopify admin
        // This is critical for app installation to complete properly
        const shopDomain = session.shop;
        const hostParam = req.query.host;
        
        console.log(`🔄 Preparing redirect after successful OAuth for shop: ${shopDomain}`);
        console.log(`Host parameter available: ${hostParam ? 'yes' : 'no'}`);
        
        // Construct the return URL based on available information
        let redirectUrl;
        
        if (hostParam) {
          // If host is provided, decode it
          try {
            // The host parameter is base64 encoded
            const decodedHost = Buffer.from(hostParam, 'base64').toString('utf-8');
            console.log('Decoded host:', decodedHost);
            
            // For admin.shopify.com hosts, we need a special format
            if (decodedHost.includes('admin.shopify.com')) {
              // Extract the store part from the host
              const storeMatch = decodedHost.match(/\/store\/([^\/]+)/);
              const storeName = storeMatch ? storeMatch[1] : null;
              
              console.log('Detected admin.shopify.com host. Store name:', storeName);
              
              if (storeName) {
                // Use new format for admin.shopify.com embedded apps
                redirectUrl = `https://admin.shopify.com/store/${storeName}/apps/${process.env.SHOPIFY_API_KEY}`;
              } else {
                // Fallback to standard redirect
                redirectUrl = `https://${shopDomain}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
              }
            } else {
              // Standard shop domain format
              redirectUrl = `https://${decodedHost}/apps/${process.env.SHOPIFY_API_KEY}`;
            }
          } catch (error) {
            console.error('Error decoding host parameter:', error);
            // Fallback for invalid host
            redirectUrl = `https://${shopDomain}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
          }
        } else {
          // No host parameter - direct to Shopify admin
          console.log('No host parameter, redirecting directly to Shopify admin');
          redirectUrl = `https://${shopDomain}/admin/apps/${process.env.SHOPIFY_API_KEY}`;
        }
        
        console.log(`🔀 Redirecting to: ${redirectUrl}`);
        res.redirect(redirectUrl);
      } else {
        console.log('Headers already sent, not performing redirect');
      }
    } catch (innerError) {
      console.error('❌ Error during OAuth callback processing:', innerError);
      console.error('Inner error details:', innerError.stack);
      throw innerError; // Re-throw to be caught by the outer catch block
    }
  } catch (error) {
    console.error('Error during auth callback:', error);
    console.error('Error details:', error.stack);
    
    // Check if headers have already been sent
    if (!res.headersSent) {
      // Provide a more user-friendly error page
      res.status(500).send(`
        <html>
          <head>
            <title>Authentication Error</title>
            <style>
              body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.5; max-width: 800px; margin: 0 auto; }
              h1 { color: #bf0711; }
              pre { background: #f4f6f8; padding: 15px; border-radius: 4px; overflow: auto; }
              .back { display: inline-block; margin-top: 20px; color: #5c6ac4; text-decoration: none; }
            </style>
          </head>
          <body>
            <h1>Authentication Error</h1>
            <p>There was a problem authenticating with Shopify:</p>
            <pre>${error.message}</pre>
            <p>Please try again or contact support if the issue persists.</p>
            <a href="/" class="back">← Back to Home</a>
          </body>
        </html>
      `);
    } else {
      console.warn('Headers already sent, could not send error page to client');
    }
  }
});

// Installation page - easy access to start the auth process
app.get('/install', (req, res) => {
  console.log('Serving installation page');
  // Serve the installation HTML file
  res.sendFile(path.join(__dirname, '..', 'public', 'install.html'));
});

// Status route to check server and configuration status
app.get('/status', (req, res) => {
  // Check MongoDB connection status
  let dbStatus = 'unknown';
  try {
    const database = require('../src/services/database');
    dbStatus = database.isConnected() ? 'connected' : 'disconnected';
  } catch (err) {
    dbStatus = `error: ${err.message}`;
  }

  // Return server status information
  res.json({
    status: 'ok',
    server: {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      node_version: process.version
    },
    shopify: {
      api_version: LATEST_API_VERSION,
      scopes: process.env.SCOPES.split(','),
      host: process.env.HOST
    },
    database: {
      status: dbStatus,
      type: process.env.MONGODB_URI ? 'mongodb' : 'in-memory'
    }
  });
});

// API Routes - protected by authentication with improved error handling
app.use('/api', async (req, res, next) => {
  // Log API request with method and path for debugging
  console.log(`API request: ${req.method} ${req.path}`);
  
  // For testing and development purposes or special endpoints
  // Allow access without authentication in specific scenarios
  const publicEndpoints = ['preview', 'homepage/template', 'store/data', 'templates', 'status'];
  const isPublicEndpoint = publicEndpoints.some(path => req.path.includes(path));
  
  // Skip authentication for public endpoints or in development mode
  if ((isPublicEndpoint && (process.env.NODE_ENV === 'development' || process.env.ALLOW_UNAUTHENTICATED_API === 'true')) || 
      req.path === '/status') {
    console.log(`Allowing unauthenticated access to ${req.path} in ${process.env.NODE_ENV || 'unknown'} mode`);
    return next();
  }
  
  // Get shop from multiple sources with validation
  const shop = req.query.shop || req.headers['x-shopify-shop-domain'] || process.env.SHOP;
  
  if (!shop) {
    console.log('API request rejected: Missing shop identification');
    return res.status(400).json({ 
      error: 'missing_shop',
      message: 'Shop parameter is required. Provide it as a query parameter or header.',
      details: 'Add ?shop=your-store.myshopify.com to your request or set the X-Shopify-Shop-Domain header'
    });
  }
  
  // Clean up shop domain if needed (similar to auth route)
  let cleanShop = shop.toString().trim();
  cleanShop = cleanShop.replace(/^https?:\/\//, '');
  cleanShop = cleanShop.replace(/\/+$/, '');
  
  // Session loading with improved error handling
  let session;
  let sessionSource = 'none';
  
  try {
    // Try to load from MongoDB first
    try {
      const database = require('../src/services/database');
      
      // Check if database is connected before attempting to load
      if (database.isConnected()) {
        session = await database.loadSession(cleanShop);
        
        if (session) {
          console.log(`Loaded valid session from MongoDB for shop: ${cleanShop}`);
          sessionSource = 'mongodb';
        }
      } else {
        console.warn('MongoDB not connected, skipping database session lookup');
      }
    } catch (dbError) {
      console.error('Error loading session from MongoDB:', dbError.message);
      // Continue to in-memory fallback without blocking
    }
    
    // Fall back to in-memory storage if not found in MongoDB
    if (!session) {
      const sessionKey = `${cleanShop}_offline`;
      session = SESSION_STORAGE.get(sessionKey);
      
      if (session) {
        console.log(`Found valid session in memory storage for shop: ${cleanShop}`);
        sessionSource = 'memory';
      }
    }
    
    // Check for valid session with detailed error messages
    if (!session) {
      console.log(`No session found for shop: ${cleanShop}`);
      return res.status(401).json({ 
        error: 'unauthorized', 
        message: 'No valid session found for this shop. Please authenticate first.',
        redirect: `/auth?shop=${encodeURIComponent(cleanShop)}`
      });
    }
    
    // Validate session hasn't expired
    if (session.expires && new Date(session.expires) < new Date()) {
      console.log(`Session for shop ${cleanShop} has expired at ${new Date(session.expires).toISOString()}`);
      return res.status(401).json({ 
        error: 'session_expired', 
        message: 'Your session has expired. Please authenticate again.',
        redirect: `/auth?shop=${encodeURIComponent(cleanShop)}`
      });
    }
    
    // Set validated session for API routes
    req.shopifySession = session;
    req.shopDomain = cleanShop;
    console.log(`API request authorized for shop: ${cleanShop} (session source: ${sessionSource})`);
    next();
  } catch (error) {
    // Handle unexpected errors in authentication flow
    console.error('Unexpected error in API authentication middleware:', error);
    res.status(500).json({ 
      error: 'server_error', 
      message: 'An unexpected error occurred while processing your request.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}, require('./routes/api'));

// Create a simple testing HTML file for our new dashboard
const dashboardHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta Maximus Dashboard</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f6f6f7;
      color: #212b36;
      line-height: 1.5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
      margin-bottom: 20px;
      padding: 20px;
    }
    .nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .nav a {
      padding: 10px 15px;
      background: #5c6ac4;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .nav a:hover {
      background: #4959bd;
    }
    h1, h2, h3, h4 {
      margin-top: 0;
      color: #212b36;
    }
    h3 {
      margin-top: 25px;
      margin-bottom: 15px;
      font-size: 18px;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 8px;
    }
    h4 {
      margin-top: 20px;
      margin-bottom: 10px;
      font-size: 16px;
    }
    p {
      margin-bottom: 15px;
      color: #454f5b;
    }
    .subtitle {
      font-size: 18px;
      color: #637381;
      margin-top: -10px;
      margin-bottom: 25px;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .best-practices {
      padding-left: 20px;
      margin-bottom: 20px;
    }
    .best-practices li {
      margin-bottom: 8px;
    }
    .tip {
      font-weight: bold;
      color: #5c6ac4;
    }
    .pro-tip {
      background-color: #f9fafb;
      border-left: 4px solid #5c6ac4;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 4px 4px 0;
    }
    .pro-tip h4 {
      margin-top: 0;
      color: #5c6ac4;
    }
    .pro-tip p {
      margin-bottom: 0;
    }
    code {
      background: #f4f6f8;
      padding: 2px 5px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 14px;
    }
    ol, ul {
      padding-left: 25px;
    }
    ol li, ul li {
      margin-bottom: 8px;
    }
    .nav-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 15px;
    }
    .nav-item {
      background: #f9fafb;
      border-radius: 8px;
      padding: 20px;
      text-decoration: none;
      color: inherit;
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid #e6e6e6;
    }
    .nav-item:hover {
      transform: translateY(-3px);
      box-shadow: 0 4px 10px rgba(0,0,0,0.1);
    }
    .nav-icon {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .nav-item h3 {
      font-size: 18px;
      margin: 0 0 10px 0;
      border: none;
      padding: 0;
    }
    .nav-item p {
      margin: 0;
      color: #637381;
      font-size: 14px;
    }
  
    /* Badge-style variable buttons */
    .variable-buttons {
      margin: 4px 0 6px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    /* Badge-style buttons */
    .badge-button {
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 12px; /* Fully rounded corners */
      cursor: pointer;
      transition: all 0.2s;
    }
    
    /* Regular variables */
    .badge-button.var {
      background-color: #e0e5f0;
      color: #5c6ac4;
    }
    .badge-button.var:hover {
      background-color: #c9cfe0;
    }
    
    /* Primary variables */
    .badge-button.primary {
      background-color: #eaf5fe;
      color: #007ace;
    }
    .badge-button.primary:hover {
      background-color: #b4dbf7;
    }
    
    /* Conditional logic */
    .badge-button.conditional {
      background-color: #e3f1df;
      color: #108043;
    }
    .badge-button.conditional:hover {
      background-color: #bbe5b3;
    }
    
    /* Format modifiers */
    .badge-button.format {
      background-color: #f6f0fd;
      color: #9c6ade;
    }
    .badge-button.format:hover {
      background-color: #e3d0ff;
    }
    
    /* Discount variables */
    .badge-button.discount {
      background-color: #fdf6e3;
      color: #daa520;
    }
    .badge-button.discount:hover {
      background-color: #f9e9c0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Meta Maximus Dashboard</h1>
    
    <div class="nav">
      <a href="/">Home</a>
      <a href="/homepage">Home Page Settings</a>
      <a href="/collections">Collection Settings</a>
      <a href="/products">Product Settings</a>
    </div>
    
    <div class="card">
      <h2>Welcome to Meta Maximus</h2>
      <p class="subtitle">Dynamic SEO meta tag management for Shopify</p>
      
      <div class="info-section">
        <h3>How to Use Meta Maximus</h3>
        <p>Meta Maximus helps you manage dynamic SEO meta tags across your entire Shopify store. Follow these steps to get started:</p>
        
        <ol>
          <li><strong>Home Page Settings:</strong> Configure meta tags for your store's main page</li>
          <li><strong>Collection Settings:</strong> Set up templates for collection pages with dynamic variables</li>
          <li><strong>Product Settings:</strong> Create templates for product pages and set up custom rules</li>
        </ol>
        
        <p>Use our powerful variable system to make your meta tags dynamic and SEO-friendly. Variables are automatically replaced with real values when pages are served.</p>
      </div>
      
      <div class="info-section">
        <h3>SEO Best Practices</h3>
        
        <h4>Meta Titles</h4>
        <ul class="best-practices">
          <li><span class="tip">Length:</span> Keep titles between 50-60 characters to avoid truncation in search results</li>
          <li><span class="tip">Keywords:</span> Include your primary keyword near the beginning of the title</li>
          <li><span class="tip">Branding:</span> Include your store or brand name, usually at the end</li>
          <li><span class="tip">Uniqueness:</span> Each page should have a unique, descriptive title</li>
        </ul>
        
        <h4>Meta Descriptions</h4>
        <ul class="best-practices">
          <li><span class="tip">Length:</span> Aim for 120-155 characters to prevent truncation</li>
          <li><span class="tip">Call to Action:</span> Include a clear call to action where appropriate</li>
          <li><span class="tip">Keywords:</span> Naturally incorporate relevant keywords</li>
          <li><span class="tip">Value Proposition:</span> Highlight what makes your products unique</li>
        </ul>
        
        <div class="pro-tip">
          <h4>💡 Pro Tip:</h4>
          <p>Use variables like <code>{{season}}</code> and <code>{{year}}</code> to keep your meta tags fresh without manual updates. For sales or discounts, use conditional variables like <code>{{if hasDiscount}}</code> to automatically display relevant information.</p>
        </div>
      </div>
    </div>
    
    <div class="card">
      <h2>Navigation</h2>
      <div class="nav-grid">
        <a href="/homepage" class="nav-item">
          <div class="nav-icon">🏠</div>
          <h3>Home Page Settings</h3>
          <p>Configure meta tags for your store's main page</p>
        </a>
        <a href="/collections" class="nav-item">
          <div class="nav-icon">📚</div>
          <h3>Collection Settings</h3>
          <p>Set up templates for all collection pages</p>
        </a>
        <a href="/products" class="nav-item">
          <div class="nav-icon">🛍️</div>
          <h3>Product Settings</h3>
          <p>Manage meta tags for product pages</p>
        </a>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Create a simple templates page HTML
const templatesHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meta Maximus</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f6f6f7;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
      margin-bottom: 20px;
      padding: 20px;
    }
    .nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .nav a {
      padding: 10px 15px;
      background: #5c6ac4;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    h1, h2, h3 {
      margin-top: 0;
    }
    textarea {
      width: 100%;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #ddd;
      min-height: 100px;
      margin-bottom: 5px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    button {
      padding: 10px 15px;
      background: #5c6ac4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .badge.good {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }
    .badge.bad {
      background: #ffd2d2;
      color: #bf0711;
    }
    
    
    .character-count {
      font-size: 12px;
      margin-bottom: 15px;
      color: #637381;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .badge.good {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }
    .badge.bad {
      background: #ffd2d2;
      color: #bf0711;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      cursor: pointer;
    }
    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 24px;
    }
    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #ccc;
      transition: .4s;
      border-radius: 34px;
    }
    .slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: .4s;
      border-radius: 50%;
    }
    input:checked + .slider {
      background-color: #5c6ac4;
    }
    input:checked + .slider:before {
      transform: translateX(26px);
    }
    .template-section {
      margin-bottom: 20px;
    }
    .template-content {
      display: block;
    }
    .preview-section {
      margin-top: 20px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
    }
    .google-preview {
      margin-top: 20px;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #f9f9f9;
      max-width: 600px;
      font-family: arial, sans-serif;
    }
    .google-preview-title {
      color: #1a0dab;
      font-size: 18px;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .google-preview-url {
      color: #006621;
      font-size: 14px;
      margin-bottom: 3px;
    }
    .google-preview-description {
      color: #545454;
      font-size: 14px;
      line-height: 1.4;
    }
  
    /* Badge-style variable buttons */
    .variable-buttons {
      margin: 4px 0 6px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    /* Badge-style buttons */
    .badge-button {
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 12px; /* Fully rounded corners */
      cursor: pointer;
      transition: all 0.2s;
    }
    
    /* Regular variables */
    .badge-button.var {
      background-color: #e0e5f0;
      color: #5c6ac4;
    }
    .badge-button.var:hover {
      background-color: #c9cfe0;
    }
    
    /* Primary variables */
    .badge-button.primary {
      background-color: #eaf5fe;
      color: #007ace;
    }
    .badge-button.primary:hover {
      background-color: #b4dbf7;
    }
    
    /* Conditional logic */
    .badge-button.conditional {
      background-color: #e3f1df;
      color: #108043;
    }
    .badge-button.conditional:hover {
      background-color: #bbe5b3;
    }
    
    /* Format modifiers */
    .badge-button.format {
      background-color: #f6f0fd;
      color: #9c6ade;
    }
    .badge-button.format:hover {
      background-color: #e3d0ff;
    }
    
    /* Discount variables */
    .badge-button.discount {
      background-color: #fdf6e3;
      color: #daa520;
    }
    .badge-button.discount:hover {
      background-color: #f9e9c0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Global Templates</h1>
    
    <div class="nav">
      <a href="/">Home</a>
      <a href="/homepage">Home Page</a>
      <a href="/templates">Global Templates</a>
      <a href="/collections">Collections</a>
      <a href="/products">Products</a>
    </div>
    
    <!-- Collection Templates -->
    <div class="card">
      <div class="header-section" id="collectionsHeader">
        <h2>Collection Templates</h2>
        <label class="toggle-switch">
          <input type="checkbox" id="collectionsToggle" checked>
          <span class="slider"></span>
        </label>
      </div>
      
      <div class="template-section" id="collectionsSection">
        <p style="color: #637381; margin-bottom: 15px;">
          These are your default settings that will override the settings in Shopify. 
          It might take several days before the results appear in Google search results, 
          depending on how often Google indexes your site.
        </p>
      
        <div>
          <label for="collectionTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
          <!-- Common variables -->
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{shopifyTitle}}')">DEFAULT</button>
          <button type="button" class="badge-button var" onclick="insertVariable('homeDescription', '{{shopifyDescription}}')">DEFAULT</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{year}}')">YEAR</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{month}}')">MONTH</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{season}}')">SEASON</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{storeName}}')">STORE</button>
          <!-- Conditionals -->
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{if hasDiscount}}')">IF DISCOUNT</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{else}}')">ELSE</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{endif}}')">ENDIF</button>
          <!-- Special variables -->
          <button type="button" class="badge-button var" onclick="insertVariable('homeDescription', '{{maxDiscountPercentage}}')">DISCOUNT%</button>
          
          <!-- Format modifiers -->
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':initialCaps')">INITIAL CAPS</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':uppercase')">UPPER</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':lowercase')">LOWER</button>
        </div>
          <input type="text" id="collectionTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
          <div class="character-count">
            <span id="collectionTitleCount">0</span> characters 
            <span class="badge" id="collectionTitleBadge">checking...</span>
            <span id="collectionTitleAdvice"></span>
          </div>
        </div>
        <div>
          <label for="collectionDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{shopifyTitle}}')">DEFAULT</button>
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionTitle', ':initialCaps')">INITIAL CAPS</button>
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('collectionDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('collectionDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="collectionDescription">Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}</textarea>
          <div class="character-count">
            <span id="collectionDescriptionCount">0</span> characters 
            <span class="badge" id="collectionDescriptionBadge">checking...</span>
            <span id="collectionDescriptionAdvice"></span>
          </div>
          
          <!-- Variable Buttons -->
          <div style="margin: 15px 0; border: 1px solid #ddd; padding: 15px; border-radius: 5px; background-color: #f9f9f9;">
            <h3 style="margin-top: 0; color: #5c6ac4;">Quick Insert Variables:</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{year}}')">YEAR</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{month}}')">MONTH</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{season}}')">SEASON</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{date}}')">DATE</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{productTitle}}')">PRODUCT</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{collectionTitle}}')">COLLECTION</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{storeName}}')">STORE</button>
            </div>
            
            <h3 style="margin-top: 0; color: #5c6ac4;">Conditional Logic:</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 15px;">
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{if hasDiscount}}...{{endif}}')">IF DISCOUNT</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertVariable('collectionDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            </div>
            
            <h3 style="margin-top: 0; color: #5c6ac4;">Format Modifiers:</h3>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertModifier('collectionDescription', ':uppercase')">UPPERCASE</button>
              <button type="button" style="padding: 5px 10px; background-color: #5c6ac4; color: white; border: none; border-radius: 4px;" onclick="insertModifier('collectionDescription', ':lowercase')">LOWERCASE</button>
            </div>
          </div>
        </div>
        <div style="margin-top: 15px;">
          <button id="saveCollectionBtn">Save Collection Templates</button>
        </div>
      </div>
    </div>
    
    <!-- Product Templates -->
    <div class="card">
      <div class="header-section" id="productsHeader">
        <h2>Product Templates</h2>
        <label class="toggle-switch">
          <input type="checkbox" id="productsToggle" checked>
          <span class="slider"></span>
        </label>
      </div>
      
      <div class="template-section" id="productsSection">
        <p style="color: #637381; margin-bottom: 15px;">
          These are your default settings that will override the settings in Shopify. 
          It might take several days before the results appear in Google search results, 
          depending on how often Google indexes your site.
        </p>
      
        <div>
          <label for="productTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{shopifyTitle}}')">DEFAULT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{shopifyDescription}}')">DEFAULT</button>
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('productTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('productTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('productTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':initialCaps')">INITIAL CAPS</button>
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="productTitle" value="{{productTitle}} - {{season}} {{year}} | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
          <div class="character-count">
            <span id="productTitleCount">0</span> characters 
            <span class="badge" id="productTitleBadge">checking...</span>
            <span id="productTitleAdvice"></span>
          </div>
        </div>
        <div>
          <label for="productDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{shopifyDescription}}')">DEFAULT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{shopifyTitle}}')">DEFAULT</button>
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('productDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('productDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('productDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':initialCaps')">INITIAL CAPS</button>
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('productDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('productDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="productDescription">Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{endif}}</textarea>
          <div class="character-count">
            <span id="productDescriptionCount">0</span> characters 
            <span class="badge" id="productDescriptionBadge">checking...</span>
            <span id="productDescriptionAdvice"></span>
          </div>
        </div>
        <div style="margin-top: 15px;">
          <button id="saveProductBtn">Save Product Templates</button>
        </div>
      </div>
    </div>
    
    <!-- Search Preview -->
    <div class="card preview-section" id="searchPreview">
      <h3>Google Search Preview</h3>
      <div class="google-preview">
        <div class="google-preview-title" id="previewTitle">Your Store: Collection Title</div>
        <div class="google-preview-url">https://your-store.myshopify.com/</div>
        <div class="google-preview-description" id="previewDescription">
          This is how your meta description will appear in Google search results. Make it compelling to improve click-through rates.
        </div>
      </div>
    </div>
    
    <!-- Variable Reference Card -->
    <div class="card">
      <div class="header-section" id="variablesHeader">
        <h2>Variable Reference</h2>
        <label class="toggle-switch">
          <input type="checkbox" id="variablesToggle" checked>
          <span class="slider"></span>
        </label>
      </div>
      
      <div id="variablesSection">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <h3>Basic Variables</h3>
            <ul>
              <li><code>{{year}}</code> - Current year (e.g., 2025)</li>
              <li><code>{{month}}</code> - Current month name (e.g., May)</li>
              <li><code>{{season}}</code> - Current season (Spring, Summer, Fall, Winter)</li>
              <li><code>{{date}}</code> - Formatted date (e.g., May 6, 2025)</li>
            </ul>
            
            <h3>Product Variables</h3>
            <ul>
              <li><code>{{productTitle}}</code> - Product title</li>
              <li><code>{{productType}}</code> - Product type</li>
              <li><code>{{productVendor}}</code> - Product vendor</li>
              <li><code>{{productPrice}}</code> - Current product price</li>
              <li><code>{{comparePrice}}</code> - Compare-at price</li>
            </ul>
          </div>
          
          <div>
            <h3>Collection Variables</h3>
            <ul>
              <li><code>{{collectionTitle}}</code> - Collection title</li>
              <li><code>{{collectionDescription}}</code> - Collection description excerpt</li>
              <li><code>{{collectionCount}}</code> - Number of products in collection</li>
              <li><code>{{maxDiscountPercentage}}</code> - Highest discount percentage</li>
              <li><code>{{minDiscountPercentage}}</code> - Lowest discount percentage</li>
              <li><code>{{discountRange}}</code> - Range of discounts (e.g., "20-50%")</li>
              <li><code>{{hasDiscount}}</code> - Boolean flag for discounts</li>
              <li><code>{{discountedCount}}</code> - Number of discounted products</li>
            </ul>
            
            <h3>Format Modifiers</h3>
            <ul>
              <li><code>{{variable:lowercase}}</code> - Convert to lowercase</li>
              <li><code>{{variable:uppercase}}</code> - Convert to uppercase</li>
            </ul>
            
            <h3>Conditional Logic</h3>
            <p><code>{{if hasDiscount}}On Sale!{{else}}Regular Price{{endif}}</code></p>
          </div>
        </div>
        
        <div class="card" style="margin-top: 20px;">
          <h3>Meta Tag Length Guidelines</h3>
          <p>
            <strong>Meta Titles:</strong> Optimal length is 50-60 characters. Google typically displays the first 50-60 characters of a page title.
            <br>
            <strong>Meta Descriptions:</strong> Optimal length is 120-155 characters. Google usually truncates meta descriptions to around 155-160 characters on desktop.
          </p>
          <p>
            <strong>Note about Variables:</strong> When using variables, character count will vary depending on the actual values. For example, <code>{{productTitle}}</code> could be 15-50 characters long. Always preview with real data to check final length.
          </p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

// Create a simple collections page HTML
const collectionsHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Collection Settings - Meta Maximus</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f6f6f7;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
      margin-bottom: 20px;
      padding: 20px;
    }
    .nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .nav a {
      padding: 10px 15px;
      background: #5c6ac4;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f6f6f7;
    }
    
    .badge.green {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.blue {
      background: #d4e8f7;
      color: #1c6da3;
    }
    h1, h2, h3 {
      margin-top: 0;
    }
    button, .button {
      padding: 6px 12px;
      background: #5c6ac4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      display: inline-block;
    }
    .button.secondary {
      background: #f4f6f8;
      color: #212b36;
      border: 1px solid #c4cdd5;
    }
    .button.danger {
      background: #fd5749;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 10% auto;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      width: 50%;
      max-width: 600px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    .close:hover {
      color: black;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    textarea {
      width: 100%;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #ddd;
      min-height: 80px;
      margin-bottom: 15px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .google-preview {
      margin-top: 20px;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #f9f9f9;
      max-width: 600px;
      font-family: arial, sans-serif;
    }
    .google-preview-title {
      color: #1a0dab;
      font-size: 18px;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .google-preview-url {
      color: #006621;
      font-size: 14px;
      margin-bottom: 3px;
    }
    .google-preview-description {
      color: #545454;
      font-size: 14px;
      line-height: 1.4;
    }
    .date-picker {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
      margin-bottom: 15px;
    }
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
  
    .character-count {
      font-size: 12px;
      margin-bottom: 15px;
      color: #637381;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .badge.good {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }
    .badge.bad {
      background: #ffd2d2;
      color: #bf0711;
    }
    /* Badge-style variable buttons */
    .variable-buttons {
      margin: 4px 0 6px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    /* Badge-style buttons */
    .badge-button {
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 12px; /* Fully rounded corners */
      cursor: pointer;
      transition: all 0.2s;
    }
    
    /* Regular variables */
    .badge-button.var {
      background-color: #e0e5f0;
      color: #5c6ac4;
    }
    .badge-button.var:hover {
      background-color: #c9cfe0;
    }
    
    /* Primary variables */
    .badge-button.primary {
      background-color: #eaf5fe;
      color: #007ace;
    }
    .badge-button.primary:hover {
      background-color: #b4dbf7;
    }
    
    /* Conditional logic */
    .badge-button.conditional {
      background-color: #e3f1df;
      color: #108043;
    }
    .badge-button.conditional:hover {
      background-color: #bbe5b3;
    }
    
    /* Format modifiers */
    .badge-button.format {
      background-color: #f6f0fd;
      color: #9c6ade;
    }
    .badge-button.format:hover {
      background-color: #e3d0ff;
    }
    
    /* Discount variables */
    .badge-button.discount {
      background-color: #fdf6e3;
      color: #daa520;
    }
    .badge-button.discount:hover {
      background-color: #f9e9c0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Collection Settings</h1>
    
    <div class="nav">
      <a href="/">Home</a>
      <a href="/homepage">Home Page Settings</a>
      <a href="/collections">Collection Settings</a>
      <a href="/products">Product Settings</a>
    </div>
    
    <!-- Global Collection Settings Info Card -->
    <div class="card">
      <h2>Global Collection Settings</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        These are your default settings that will override the settings in Shopify. 
        It might take several days before the results appear in Google search results, 
        depending on how often Google indexes your site.
      </p>
      
      <div>
        <label for="collectionTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{shopifyTitle}}')">DEFAULT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{shopifyDescription}}')">DEFAULT</button>
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':initialCaps')">INITIAL CAPS</button>
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionTitle', ':lowercase')">LOWER</button>
          </div>
        <input type="text" id="collectionTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        <div class="character-count">
          <span id="collectionTitleCount">56</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div>
        <label for="collectionDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{shopifyDescription}}')">DEFAULT</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('collectionDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('collectionDescription', '{{discountRange}}')">RANGE</button>
          </div>
        <textarea id="collectionDescription">Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}</textarea>
        <div class="character-count">
          <span id="collectionDescriptionCount">125</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div style="margin-top: 15px;">
        <button id="saveGlobalTemplates">Save Collection Templates</button>
      </div>
    </div>
    
    <!-- Search Preview -->
    <div class="card" id="collectionSearchPreview">
      <h3>Google Search Preview</h3>
      <div class="google-preview">
        <div class="google-preview-title" id="collectionPreviewTitle">Summer Collection - Summer 2025 Collection | Your Store</div>
        <div class="google-preview-url">https://your-store.myshopify.com/collections/summer</div>
        <div class="google-preview-description" id="collectionPreviewDescription">
          Explore our Summer Collection for Summer 2025. Save up to 40% on selected items!
        </div>
      </div>
    </div>
    
    <!-- Custom Rules for Collections -->
    <div class="card">
      <h2>Custom Rules</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        Create custom rules for specific collections to override global settings. 
        Search for collections by name and schedule rules with start and end dates.
      </p>
      
      <button id="createCollectionRuleBtn" style="margin-bottom: 20px;">Create Custom Rule</button>
      
      <table>
        <thead>
          <tr>
            <th>Collection</th>
            <th>Products</th>
            <th>Status</th>
            <th>Schedule</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: bold;">Summer Essentials</div>
              <div style="font-size: 12px; color: #637381;">summer-essentials</div>
            </td>
            <td>24</td>
            <td><span class="badge green">Active</span></td>
            <td>No end date</td>
            <td>
              <button class="edit-btn" data-id="summer-essentials" data-name="Summer Essentials">Edit</button>
              <button class="pause-btn" data-id="summer-essentials" data-name="Summer Essentials">Pause</button>
              <button class="reset-btn" data-id="summer-essentials" data-name="Summer Essentials" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: bold;">Sale Items</div>
              <div style="font-size: 12px; color: #637381;">sale-items</div>
            </td>
            <td>18</td>
            <td><span class="badge blue">Scheduled</span></td>
            <td>May 1 - Jun 15, 2025</td>
            <td>
              <button class="edit-btn" data-id="sale-items" data-name="Sale Items">Edit</button>
              <button class="pause-btn" data-id="sale-items" data-name="Sale Items">Pause</button>
              <button class="reset-btn" data-id="sale-items" data-name="Sale Items" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: bold;">Fall Collection</div>
              <div style="font-size: 12px; color: #637381;">fall-collection</div>
            </td>
            <td>32</td>
            <td><span class="badge warning">Paused</span></td>
            <td>Sep 1 - Nov 30, 2025</td>
            <td>
              <button class="edit-btn" data-id="fall-collection" data-name="Fall Collection">Edit</button>
              <button class="resume-btn" data-id="fall-collection" data-name="Fall Collection" style="background: #50b83c;">Resume</button>
              <button class="reset-btn" data-id="fall-collection" data-name="Fall Collection" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Scheduling Section -->
    <div class="card">
      <h2>Scheduled Global Template Changes</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        Schedule updates to your global collection meta tags to automatically go live on a specific date.
        Perfect for seasonal promotions and sales events.
      </p>
      
      <button id="scheduleNewChange" style="margin-bottom: 20px;">Schedule a Template Change</button>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Schedule</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: bold;">Back to School Sale</div>
            </td>
            <td><span class="badge blue">Scheduled</span></td>
            <td>Aug 1 - Sep 15, 2025</td>
            <td>
              <button class="edit-btn" data-id="back-to-school">Edit</button>
              <button class="pause-btn" data-id="back-to-school">Pause</button>
              <button class="reset-btn" data-id="back-to-school" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: bold;">Winter Collection Promo</div>
            </td>
            <td><span class="badge warning">Paused</span></td>
            <td>Dec 1, 2025 - Jan 31, 2026</td>
            <td>
              <button class="edit-btn" data-id="winter-promo">Edit</button>
              <button class="resume-btn" data-id="winter-promo" style="background: #50b83c;">Resume</button>
              <button class="reset-btn" data-id="winter-promo" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Variable Reference -->
    <div class="card">
      <h2>Available Variables</h2>
      
      <div class="two-columns">
        <div>
          <h3>Basic Variables</h3>
          <div style="margin-bottom: 15px;">
            <code>{{storeName}}</code> - Your store's name<br />
            <code>{{year}}</code> - Current year (e.g., 2025)<br />
            <code>{{season}}</code> - Current season (Spring, Summer, Fall, Winter)
          </div>
          
          <h3>Collection Variables</h3>
          <div style="margin-bottom: 15px;">
            <code>{{collectionTitle}}</code> - The collection's title<br />
            <code>{{collectionDescription}}</code> - Short excerpt from collection description<br />
            <code>{{productsCount}}</code> - Number of products in the collection
          </div>
        </div>
        
        <div>
          <h3>Discount Variables</h3>
          <div style="margin-bottom: 15px;">
            <code>{{hasDiscount}}</code> - Boolean flag if any products have discounts<br />
            <code>{{maxDiscountPercentage}}</code> - Highest discount percentage<br />
            <code>{{discountRange}}</code> - Range of discounts (e.g., "10-30%")<br />
            <code>{{discountedCount}}</code> - Number of discounted products
          </div>
          
          <h3>Conditional Logic</h3>
          <div style="margin-bottom: 15px;">
            <code>{{if hasDiscount}}</code> Sale text here <code>{{else}}</code> Regular text here <code>{{endif}}</code>
          </div>
          
          <h3>Format Modifiers</h3>
          <div style="margin-bottom: 15px;">
            <code>{{collectionTitle:uppercase}}</code> - Convert to uppercase<br />
            <code>{{collectionTitle:lowercase}}</code> - Convert to lowercase
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Edit Modal -->
  <div id="editModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Edit Meta Tags for <span id="editModalCollection">Collection</span></h2>
      
      <form id="editForm">
        <input type="hidden" id="editCollectionId" value="">
        
        <div>
          <label for="editTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('editTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('editTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('editTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('editTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('editTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="editTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="editDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('editDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('editDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('editDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('editDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('editDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('editDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('editDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="editDescription">Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}</textarea>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="editPreviewTitle">Collection Title - Summer 2025 Collection | Your Store</div>
          <div class="google-preview-url">https://your-store.myshopify.com/collections/collection-handle</div>
          <div class="google-preview-description" id="editPreviewDescription">
            Explore our Collection Title for Summer 2025. Save up to 30% on selected items!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="editCancel">Cancel</button>
          <button type="submit" class="button">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
  
  <!-- Reset Modal -->
  <div id="resetModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Remove Custom Template</h2>
      
      <p>Are you sure you want to remove <strong id="resetModalCollection">Collection</strong> from the exclusions list and reset it to use global templates?</p>
      
      <div class="form-actions">
        <button type="button" class="button secondary" id="resetCancel">Cancel</button>
        <button type="button" class="button danger" id="resetConfirm">Reset to Global Templates</button>
      </div>
    </div>
  </div>
  
  <!-- Schedule Modal -->
  <div id="scheduleModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Schedule Template Changes</h2>
      
      <form id="scheduleForm">
        <div>
          <label for="scheduleTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="scheduleTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="scheduleDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('scheduleDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('scheduleDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="scheduleDescription">Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}</textarea>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; margin-top: 20px;">
          <div style="flex: 1;">
            <label for="scheduleStart">Start Date</label>
            <input type="date" id="scheduleStart" class="date-picker" style="width: 100%;">
          </div>
          <div style="flex: 1;">
            <label for="scheduleEnd">End Date (Optional)</label>
            <input type="date" id="scheduleEnd" class="date-picker" style="width: 100%;">
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 10px;">
            <input type="checkbox" id="scheduleOverrideGlobal" checked>
            <label for="scheduleOverrideGlobal" style="display: inline; font-weight: normal;">Override global settings</label>
          </div>
          <div>
            <input type="checkbox" id="scheduleOverrideCustom" checked>
            <label for="scheduleOverrideCustom" style="display: inline; font-weight: normal;">Override custom rules</label>
          </div>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="schedulePreviewTitle">Collection Title - Summer 2025 Collection | Your Store</div>
          <div class="google-preview-url">https://your-store.myshopify.com/collections/collection-handle</div>
          <div class="google-preview-description" id="schedulePreviewDescription">
            Explore our Collections for Summer 2025. Save up to 30% on selected items!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="scheduleCancel">Cancel</button>
          <button type="button" class="button" id="schedulePreview">Preview</button>
          <button type="submit" class="button">Schedule Changes</button>
        </div>
      </form>
    </div>
  </div>
  
  <!-- Custom Rule Modal for Collections -->
  <div id="collectionRuleModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Create Custom Rule for Collection</h2>
      
      <form id="collectionRuleForm">
        <div style="margin-bottom: 15px;">
          <label for="collectionSearch">Search for Collection</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="collectionSearch" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" placeholder="Start typing collection name...">
            <button type="button" class="button" id="searchCollectionBtn">Search</button>
          </div>
        </div>
        
        <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; background: #f9f9f9;">
          <strong>Selected Collection:</strong> <span id="selectedCollection">None</span>
        </div>
        
        <div>
          <label for="collectionRuleTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionRuleTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionRuleTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionRuleTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionRuleTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionRuleTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionRuleTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionRuleTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="collectionRuleTitle" value="{{collectionTitle}} - SPECIAL {{season}} {{year}} | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="collectionRuleDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionRuleDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionRuleDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('collectionRuleDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('collectionRuleDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionRuleDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('collectionRuleDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('collectionRuleDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('collectionRuleDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('collectionRuleDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('collectionRuleDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="collectionRuleDescription">Explore our special {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on these exclusive items!{{endif}}</textarea>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; margin-top: 20px;">
          <div style="flex: 1;">
            <label for="collectionRuleStart">Start Date</label>
            <input type="date" id="collectionRuleStart" class="date-picker" style="width: 100%;">
          </div>
          <div style="flex: 1;">
            <label for="collectionRuleEnd">End Date (Optional)</label>
            <input type="date" id="collectionRuleEnd" class="date-picker" style="width: 100%;">
            <div style="font-size: 12px; color: #637381; margin-top: 5px;">Leave empty for no end date</div>
          </div>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="collectionRulePreviewTitle">Summer Collection - SPECIAL Summer 2025 | Your Store</div>
          <div class="google-preview-url">https://your-store.myshopify.com/collections/summer-collection</div>
          <div class="google-preview-description" id="collectionRulePreviewDescription">
            Explore our special Summer Collection for Summer 2025. Save up to 40% on these exclusive items!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="collectionRuleCancel">Cancel</button>
          <button type="button" class="button" id="collectionRulePreview">Preview</button>
          <button type="submit" class="button">Create Rule</button>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    // Modal functionality
    const editModal = document.getElementById('editModal');
    const resetModal = document.getElementById('resetModal');
    const scheduleModal = document.getElementById('scheduleModal');
    
    // Get all close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
      button.onclick = function() {
        editModal.style.display = 'none';
        resetModal.style.display = 'none';
        scheduleModal.style.display = 'none';
      }
    });
    
    // Simple character counter
    // Function to update the Collections Google preview
    function updateCollectionPreview() {
      const title = document.getElementById('collectionTitle').value
        .replace(/{{collectionTitle}}/g, 'Summer Collection')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{storeName}}/g, 'Your Store');
      
      const description = document.getElementById('collectionDescription').value
        .replace(/{{collectionTitle}}/g, 'Summer Collection')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{if hasDiscount}}/g, '')
        .replace(/{{maxDiscountPercentage}}/g, '40%')
        .replace(/{{else}}/g, '')
        .replace(/{{endif}}/g, '');
      
      document.getElementById('collectionPreviewTitle').textContent = title;
      document.getElementById('collectionPreviewDescription').textContent = description;
    }

    // Character counter and real-time preview for title
    document.getElementById('collectionTitle').addEventListener('input', function() {
      document.getElementById('collectionTitleCount').textContent = this.value.length;
      updateCollectionPreview();
    });
    
    // Character counter and real-time preview for description
    document.getElementById('collectionDescription').addEventListener('input', function() {
      document.getElementById('collectionDescriptionCount').textContent = this.value.length;
      updateCollectionPreview();
    });
    
    // Initial preview on page load
    updateCollectionPreview();
    
    // Save global templates
    document.getElementById('saveGlobalTemplates').addEventListener('click', function() {
      alert('Global templates saved successfully!');
    });
    
    // Schedule new changes
    document.getElementById('scheduleNewChange').addEventListener('click', function() {
      // Set default schedule date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      document.getElementById('scheduleStart').valueAsDate = tomorrow;
      
      scheduleModal.style.display = 'block';
    });
    
    // Edit functionality
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.onclick = function() {
        const collectionId = this.getAttribute('data-id');
        const collectionName = this.getAttribute('data-name');
        
        document.getElementById('editCollectionId').value = collectionId;
        document.getElementById('editModalCollection').textContent = collectionName;
        
        // In a real app, we would fetch the current template data here
        // For demo purposes, we're using default values
        
        editModal.style.display = 'block';
        
        // Initialize the preview when the modal opens
        setTimeout(updateCollectionEditPreview, 100);
      }
    });
    
    // Reset functionality
    const resetButtons = document.querySelectorAll('.reset-btn');
    resetButtons.forEach(button => {
      button.onclick = function() {
        const collectionId = this.getAttribute('data-id');
        const collectionName = this.getAttribute('data-name');
        
        document.getElementById('resetModalCollection').textContent = collectionName;
        
        resetModal.style.display = 'block';
      }
    });
    
    // Cancel buttons
    document.getElementById('editCancel').onclick = function() {
      editModal.style.display = 'none';
    }
    
    document.getElementById('resetCancel').onclick = function() {
      resetModal.style.display = 'none';
    }
    
    document.getElementById('scheduleCancel').onclick = function() {
      scheduleModal.style.display = 'none';
    }
    
    // Function for real-time edit preview updates for collections
    function updateCollectionEditPreview() {
      const title = document.getElementById('editTitle').value;
      const description = document.getElementById('editDescription').value;
      const collectionName = document.getElementById('editModalCollection').textContent;
      
      // Update the preview in real-time
      document.getElementById('editPreviewTitle').textContent = title
        .replace(/{{collectionTitle}}/g, collectionName)
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{storeName}}/g, 'Your Store');
      
      document.getElementById('editPreviewDescription').textContent = description
        .replace(/{{collectionTitle}}/g, collectionName)
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{if hasDiscount}}/g, '')
        .replace(/{{maxDiscountPercentage}}/g, '30%')
        .replace(/{{else}}/g, '')
        .replace(/{{endif}}/g, '');
    }
    
    // Add input event listeners for real-time preview updates
    document.getElementById('editTitle').addEventListener('input', updateCollectionEditPreview);
    document.getElementById('editDescription').addEventListener('input', updateCollectionEditPreview);
    
    // Function for real-time schedule preview updates
    function updateSchedulePreview() {
      const title = document.getElementById('scheduleTitle').value;
      const description = document.getElementById('scheduleDescription').value;
      
      // Update preview in real-time
      document.getElementById('schedulePreviewTitle').textContent = title
        .replace(/{{collectionTitle}}/g, 'Collection Title')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{storeName}}/g, 'Your Store');
      
      document.getElementById('schedulePreviewDescription').textContent = description
        .replace(/{{collectionTitle}}/g, 'Collections')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{if hasDiscount}}/g, '')
        .replace(/{{maxDiscountPercentage}}/g, '30%')
        .replace(/{{else}}/g, '')
        .replace(/{{endif}}/g, '');
    }
    
    // Add input event listeners for real-time preview
    document.getElementById('scheduleTitle').addEventListener('input', updateSchedulePreview);
    document.getElementById('scheduleDescription').addEventListener('input', updateSchedulePreview);
    
    // Initialize preview when modal opens
    document.getElementById('scheduleNewChange').addEventListener('click', function() {
      setTimeout(updateSchedulePreview, 100);
    });
    
    // Form submissions
    document.getElementById('editForm').onsubmit = async function(e) {
      e.preventDefault();
      
      const collectionId = document.getElementById('editCollectionId').value;
      const title = document.getElementById('editTitle').value;
      const description = document.getElementById('editDescription').value;
      
      // In a real app, we would save the data via API
      alert('Changes saved successfully!');
      editModal.style.display = 'none';
    }
    
    document.getElementById('scheduleForm').onsubmit = async function(e) {
      e.preventDefault();
      
      const title = document.getElementById('scheduleTitle').value;
      const description = document.getElementById('scheduleDescription').value;
      const startDate = document.getElementById('scheduleStart').value;
      const endDate = document.getElementById('scheduleEnd').value;
      
      // In a real app, we would schedule via API
      alert('Changes scheduled successfully!');
      scheduleModal.style.display = 'none';
    }
    
    document.getElementById('resetConfirm').onclick = async function() {
      // In a real app, we would reset via API
      alert('Collection reset to global templates');
      resetModal.style.display = 'none';
    }
    
    // Close modals when clicking outside
    window.onclick = function(event) {
      if (event.target == editModal) {
        editModal.style.display = 'none';
      } else if (event.target == resetModal) {
        resetModal.style.display = 'none';
      } else if (event.target == scheduleModal) {
        scheduleModal.style.display = 'none';
      }
    }
  
    // Variable insertion functions
    function insertVariable(textareaId, variable) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      
      // Insert variable at cursor position
      textarea.value = textarea.value.substring(0, startPos) + 
                       variable + 
                       textarea.value.substring(endPos);
      
      // Move cursor after the inserted variable
      textarea.selectionStart = textarea.selectionEnd = startPos + variable.length;
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    
    function insertModifier(textareaId, modifier) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const beforeCursor = textarea.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          textarea.value = textarea.value.substring(0, variableEndPos) + 
                           modifier +
                           textarea.value.substring(variableEndPos, textarea.value.length);
          textarea.selectionStart = textarea.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
          textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
        textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
      }
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
  </script>
</body>
</html>
`;

// Create a simple products page HTML
const productsHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Settings - Meta Maximus</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f6f6f7;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
      margin-bottom: 20px;
      padding: 20px;
    }
    .nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .nav a {
      padding: 10px 15px;
      background: #5c6ac4;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f6f6f7;
    }
    
    .badge.green {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.blue {
      background: #d4e8f7;
      color: #1c6da3;
    }
    h1, h2, h3 {
      margin-top: 0;
    }
    button, .button {
      padding: 6px 12px;
      background: #5c6ac4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      display: inline-block;
    }
    .button.secondary {
      background: #f4f6f8;
      color: #212b36;
      border: 1px solid #c4cdd5;
    }
    .button.danger {
      background: #fd5749;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 10% auto;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      width: 50%;
      max-width: 600px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    .close:hover {
      color: black;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    textarea {
      width: 100%;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #ddd;
      min-height: 80px;
      margin-bottom: 15px;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .google-preview {
      margin-top: 20px;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #f9f9f9;
      max-width: 600px;
      font-family: arial, sans-serif;
    }
    .google-preview-title {
      color: #1a0dab;
      font-size: 18px;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .google-preview-url {
      color: #006621;
      font-size: 14px;
      margin-bottom: 3px;
    }
    .google-preview-description {
      color: #545454;
      font-size: 14px;
      line-height: 1.4;
    }
    .date-picker {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
      margin-bottom: 15px;
    }
    .two-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
  
    .character-count {
      font-size: 12px;
      margin-bottom: 15px;
      color: #637381;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .badge.good {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }
    .badge.bad {
      background: #ffd2d2;
      color: #bf0711;
    }
    /* Badge-style variable buttons */
    .variable-buttons {
      margin: 4px 0 6px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    /* Badge-style buttons */
    .badge-button {
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 12px; /* Fully rounded corners */
      cursor: pointer;
      transition: all 0.2s;
    }
    
    /* Regular variables */
    .badge-button.var {
      background-color: #e0e5f0;
      color: #5c6ac4;
    }
    .badge-button.var:hover {
      background-color: #c9cfe0;
    }
    
    /* Primary variables */
    .badge-button.primary {
      background-color: #eaf5fe;
      color: #007ace;
    }
    .badge-button.primary:hover {
      background-color: #b4dbf7;
    }
    
    /* Conditional logic */
    .badge-button.conditional {
      background-color: #e3f1df;
      color: #108043;
    }
    .badge-button.conditional:hover {
      background-color: #bbe5b3;
    }
    
    /* Format modifiers */
    .badge-button.format {
      background-color: #f6f0fd;
      color: #9c6ade;
    }
    .badge-button.format:hover {
      background-color: #e3d0ff;
    }
    
    /* Discount variables */
    .badge-button.discount {
      background-color: #fdf6e3;
      color: #daa520;
    }
    .badge-button.discount:hover {
      background-color: #f9e9c0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Product Settings</h1>
    
    <div class="nav">
      <a href="/">Home</a>
      <a href="/homepage">Home Page Settings</a>
      <a href="/collections">Collection Settings</a>
      <a href="/products">Product Settings</a>
    </div>
    
    <!-- Global Product Settings Info Card -->
    <div class="card">
      <h2>Global Product Settings</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        These are your default settings that will override the settings in Shopify. 
        It might take several days before the results appear in Google search results, 
        depending on how often Google indexes your site.
      </p>
      
      <div>
        <label for="productTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('productTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('productTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('productTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productTitle', ':lowercase')">LOWER</button>
          </div>
        <input type="text" id="productTitle" value="{{productTitle}} - {{season}} {{year}} | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        <div class="character-count">
          <span id="productTitleCount">46</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div>
        <label for="productDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('productDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('productDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('productDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('productDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('productDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('productDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('productDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('productDescription', '{{discountRange}}')">RANGE</button>
          </div>
        <textarea id="productDescription">Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{maxDiscountPercentage}} off!{{else}}High-quality product from {{productVendor}}.{{endif}}</textarea>
        <div class="character-count">
          <span id="productDescriptionCount">135</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div style="margin-top: 15px;">
        <button id="saveGlobalTemplates">Save Product Templates</button>
      </div>
    </div>
    
    <!-- Search Preview -->
    <div class="card" id="productSearchPreview">
      <h3>Google Search Preview</h3>
      <div class="google-preview">
        <div class="google-preview-title" id="productPreviewTitle">Premium Cotton T-Shirt - Summer 2025 | Your Store</div>
        <div class="google-preview-url">https://your-store.myshopify.com/products/premium-cotton-t-shirt</div>
        <div class="google-preview-description" id="productPreviewDescription">
          Shop our premium Premium Cotton T-Shirt for Summer 2025. Now on sale with 25% off!
        </div>
      </div>
    </div>
    
    <!-- Custom Rules for Products -->
    <div class="card">
      <h2>Custom Rules</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        Create conditional rules to override global settings for specific products. Rules will be applied when 
        product tags match your conditions. Rules can be scheduled or run indefinitely.
      </p>
      
      <button id="createProductRuleBtn" style="margin-bottom: 20px;">Create Custom Rule</button>
      
      <table>
        <thead>
          <tr>
            <th>Rule Name</th>
            <th>Condition</th>
            <th>Status</th>
            <th>Schedule</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: bold;">Summer Sale</div>
            </td>
            <td>Tag equals "summer-sale"</td>
            <td><span class="badge green">Active</span></td>
            <td>Apr 15 - Jun 30, 2025</td>
            <td>
              <button class="edit-btn" data-id="summer-sale" data-name="Summer Sale">Edit</button>
              <button class="pause-btn" data-id="summer-sale" data-name="Summer Sale">Pause</button>
              <button class="reset-btn" data-id="summer-sale" data-name="Summer Sale" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: bold;">New Arrivals</div>
            </td>
            <td>Tag equals "new-arrival"</td>
            <td><span class="badge blue">Scheduled</span></td>
            <td>Starts May 1, 2025</td>
            <td>
              <button class="edit-btn" data-id="new-arrivals" data-name="New Arrivals">Edit</button>
              <button class="pause-btn" data-id="new-arrivals" data-name="New Arrivals">Pause</button>
              <button class="reset-btn" data-id="new-arrivals" data-name="New Arrivals" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: bold;">High-End Products</div>
            </td>
            <td>Price greater than $100</td>
            <td><span class="badge warning">Paused</span></td>
            <td>No end date</td>
            <td>
              <button class="edit-btn" data-id="high-end" data-name="High-End Products">Edit</button>
              <button class="resume-btn" data-id="high-end" data-name="High-End Products" style="background: #50b83c;">Resume</button>
              <button class="reset-btn" data-id="high-end" data-name="High-End Products" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Scheduling Section -->
    <div class="card">
      <h2>Scheduled Global Template Changes</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        Schedule updates to your global product meta tags to automatically go live on a specific date.
        Perfect for seasonal promotions and sales events.
      </p>
      
      <button id="scheduleNewChange" style="margin-bottom: 20px;">Schedule a Template Change</button>
      
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Schedule</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <div style="font-weight: bold;">Black Friday Sale</div>
            </td>
            <td><span class="badge blue">Scheduled</span></td>
            <td>Nov 20 - Nov 30, 2025</td>
            <td>
              <button class="edit-btn" data-id="black-friday">Edit</button>
              <button class="pause-btn" data-id="black-friday">Pause</button>
              <button class="reset-btn" data-id="black-friday" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td>
              <div style="font-weight: bold;">Valentine's Day Special</div>
            </td>
            <td><span class="badge warning">Paused</span></td>
            <td>Feb 1 - Feb 14, 2026</td>
            <td>
              <button class="edit-btn" data-id="valentines">Edit</button>
              <button class="resume-btn" data-id="valentines" style="background: #50b83c;">Resume</button>
              <button class="reset-btn" data-id="valentines" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Variable Reference -->
    <div class="card">
      <h2>Available Variables</h2>
      
      <div class="two-columns">
        <div>
          <h3>Basic Variables</h3>
          <div style="margin-bottom: 15px;">
            <code>{{storeName}}</code> - Your store's name<br />
            <code>{{year}}</code> - Current year (e.g., 2025)<br />
            <code>{{season}}</code> - Current season (Spring, Summer, Fall, Winter)
          </div>
          
          <h3>Product Variables</h3>
          <div style="margin-bottom: 15px;">
            <code>{{productTitle}}</code> - The product's title<br />
            <code>{{productType}}</code> - The product's type<br />
            <code>{{productVendor}}</code> - The product's vendor/brand<br />
            <code>{{productPrice}}</code> - Current product price<br />
            <code>{{comparePrice}}</code> - Compare-at price if available
          </div>
        </div>
        
        <div>
          <h3>Discount Variables</h3>
          <div style="margin-bottom: 15px;">
            <code>{{hasDiscount}}</code> - Boolean flag if the product has a discount<br />
            <code>{{discountPercentage}}</code> - Discount percentage<br />
            <code>{{discountAmount}}</code> - Discount amount in currency
          </div>
          
          <h3>Conditional Logic</h3>
          <div style="margin-bottom: 15px;">
            <code>{{if hasDiscount}}</code> Sale text here <code>{{else}}</code> Regular text here <code>{{endif}}</code>
          </div>
          
          <h3>Format Modifiers</h3>
          <div style="margin-bottom: 15px;">
            <code>{{productTitle:uppercase}}</code> - Convert to uppercase<br />
            <code>{{productTitle:lowercase}}</code> - Convert to lowercase
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Edit Modal -->
  <div id="editModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Edit Meta Tags for <span id="editModalProduct">Product</span></h2>
      
      <form id="editForm">
        <input type="hidden" id="editProductId" value="">
        
        <div>
          <label for="editTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('editTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('editTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('editTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('editTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('editTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="editTitle" value="{{productTitle}} - {{season}} {{year}} | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="editDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('editDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('editDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('editDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('editDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('editDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('editDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('editDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('editDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('editDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="editDescription">Shop our premium {{productTitle}} for {{season}} {{year}}. {{if hasDiscount}}Now on sale with {{discountPercentage}} off!{{else}}High-quality product from {{productVendor}}.{{endif}}</textarea>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="editPreviewTitle">Premium Cotton T-Shirt - Summer 2025 | Your Store</div>
          <div class="google-preview-url">https://your-store.myshopify.com/products/premium-cotton-t-shirt</div>
          <div class="google-preview-description" id="editPreviewDescription">
            Shop our premium Premium Cotton T-Shirt for Summer 2025. Now on sale with 25% off!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="editCancel">Cancel</button>
          <button type="submit" class="button">Save Changes</button>
        </div>
      </form>
    </div>
  </div>
  
  <!-- Reset Modal -->
  <div id="resetModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Remove Custom Template</h2>
      
      <p>Are you sure you want to remove <strong id="resetModalProduct">Product</strong> from the exclusions list and reset it to use global templates?</p>
      
      <div class="form-actions">
        <button type="button" class="button secondary" id="resetCancel">Cancel</button>
        <button type="button" class="button danger" id="resetConfirm">Reset to Global Templates</button>
      </div>
    </div>
  </div>
  
  <!-- Schedule Modal -->
  <div id="scheduleModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Schedule Template Changes</h2>
      
      <form id="scheduleForm">
        <div>
          <label for="scheduleTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="scheduleTitle" value="{{productTitle}} - SALE {{season}} {{year}} | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="scheduleDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('scheduleDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('scheduleDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="scheduleDescription">Limited time offer! Shop our premium {{productTitle}} for {{season}} {{year}}. Save {{discountPercentage}} for a limited time only!</textarea>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; margin-top: 20px;">
          <div style="flex: 1;">
            <label for="scheduleStart">Start Date</label>
            <input type="date" id="scheduleStart" class="date-picker" style="width: 100%;">
          </div>
          <div style="flex: 1;">
            <label for="scheduleEnd">End Date (Optional)</label>
            <input type="date" id="scheduleEnd" class="date-picker" style="width: 100%;">
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 10px;">
            <input type="checkbox" id="scheduleOverrideGlobal" checked>
            <label for="scheduleOverrideGlobal" style="display: inline; font-weight: normal;">Override global settings</label>
          </div>
          <div>
            <input type="checkbox" id="scheduleOverrideCustom" checked>
            <label for="scheduleOverrideCustom" style="display: inline; font-weight: normal;">Override custom rules</label>
          </div>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="schedulePreviewTitle">Premium Cotton T-Shirt - SALE Summer 2025 | Your Store</div>
          <div class="google-preview-url">https://your-store.myshopify.com/products/premium-cotton-t-shirt</div>
          <div class="google-preview-description" id="schedulePreviewDescription">
            Limited time offer! Shop our premium Premium Cotton T-Shirt for Summer 2025. Save 25% for a limited time only!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="scheduleCancel">Cancel</button>
          <button type="button" class="button" id="schedulePreview">Preview</button>
          <button type="submit" class="button">Schedule Changes</button>
        </div>
      </form>
    </div>
  </div>
  
  <!-- Custom Rule Modal -->
  <div id="customRuleModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Create Custom Rule</h2>
      
      <form id="customRuleForm">
        <div style="margin-bottom: 15px;">
          <label for="ruleName">Rule Name</label>
          <input type="text" id="ruleName" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" placeholder="E.g., Summer Sale Products">
        </div>
        
        <div style="margin-bottom: 15px;">
          <label>Condition</label>
          <div style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px;">
            <select style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
              <option>Product tag</option>
              <option>Product type</option>
              <option>Product vendor</option>
              <option>Product price</option>
            </select>
            <select style="padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
              <option>equals</option>
              <option>contains</option>
              <option>starts with</option>
              <option>ends with</option>
              <option>greater than</option>
              <option>less than</option>
            </select>
            <input type="text" style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" placeholder="Value">
          </div>
        </div>
        
        <div>
          <label for="ruleTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('ruleTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('ruleTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('ruleTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('ruleTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('ruleTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('ruleTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('ruleTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="ruleTitle" value="{{productTitle}} - SPECIAL {{season}} {{year}} | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="ruleDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('ruleDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('ruleDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('ruleDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('ruleDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('ruleDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('ruleDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('ruleDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('ruleDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('ruleDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('ruleDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="ruleDescription">Check out our {{productTitle}} - part of our special collection for {{season}} {{year}}. {{if hasDiscount}}Now {{discountPercentage}} off!{{endif}}</textarea>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; margin-top: 20px;">
          <div style="flex: 1;">
            <label for="ruleStart">Start Date</label>
            <input type="date" id="ruleStart" class="date-picker" style="width: 100%;">
          </div>
          <div style="flex: 1;">
            <label for="ruleEnd">End Date (Optional)</label>
            <input type="date" id="ruleEnd" class="date-picker" style="width: 100%;">
            <div style="font-size: 12px; color: #637381; margin-top: 5px;">Leave empty for no end date</div>
          </div>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="rulePreviewTitle">Premium Cotton T-Shirt - SPECIAL Summer 2025 | Your Store</div>
          <div class="google-preview-url">https://your-store.myshopify.com/products/premium-cotton-t-shirt</div>
          <div class="google-preview-description" id="rulePreviewDescription">
            Check out our Premium Cotton T-Shirt - part of our special collection for Summer 2025. Now 25% off!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="ruleCancel">Cancel</button>
          <button type="button" class="button" id="rulePreview">Preview</button>
          <button type="submit" class="button">Create Rule</button>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    // Modal functionality
    const editModal = document.getElementById('editModal');
    const resetModal = document.getElementById('resetModal');
    const scheduleModal = document.getElementById('scheduleModal');
    
    // Get all close buttons
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
      button.onclick = function() {
        editModal.style.display = 'none';
        resetModal.style.display = 'none';
        scheduleModal.style.display = 'none';
      }
    });
    
    // Function to update the Products Google preview
    function updateProductPreview() {
      const title = document.getElementById('productTitle').value
        .replace(/{{productTitle}}/g, 'Premium Cotton T-Shirt')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{storeName}}/g, 'Your Store');
      
      const description = document.getElementById('productDescription').value
        .replace(/{{productTitle}}/g, 'Premium Cotton T-Shirt')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{if hasDiscount}}/g, '')
        .replace(/{{maxDiscountPercentage}}/g, '25%')
        .replace(/{{else}}/g, '')
        .replace(/{{productVendor}}/g, 'Fashion Brand')
        .replace(/{{endif}}/g, '');
      
      document.getElementById('productPreviewTitle').textContent = title;
      document.getElementById('productPreviewDescription').textContent = description;
    }

    // Character counter and real-time preview for title
    document.getElementById('productTitle').addEventListener('input', function() {
      document.getElementById('productTitleCount').textContent = this.value.length;
      updateProductPreview();
    });
    
    // Character counter and real-time preview for description
    document.getElementById('productDescription').addEventListener('input', function() {
      document.getElementById('productDescriptionCount').textContent = this.value.length;
      updateProductPreview();
    });
    
    // Initial preview on page load
    updateProductPreview();
    
    // Save global templates
    document.getElementById('saveGlobalTemplates').addEventListener('click', function() {
      alert('Global templates saved successfully!');
    });
    
    // Schedule new changes
    document.getElementById('scheduleNewChange').addEventListener('click', function() {
      // Set default schedule date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      document.getElementById('scheduleStart').valueAsDate = tomorrow;
      
      scheduleModal.style.display = 'block';
    });
    
    // Edit functionality
    const editButtons = document.querySelectorAll('.edit-btn');
    editButtons.forEach(button => {
      button.onclick = function() {
        const productId = this.getAttribute('data-id');
        const productName = this.getAttribute('data-name');
        
        document.getElementById('editProductId').value = productId;
        document.getElementById('editModalProduct').textContent = productName;
        
        // In a real app, we would fetch the current template data here
        // For demo purposes, we're using default values
        
        editModal.style.display = 'block';
        
        // Initialize the preview when the modal opens
        setTimeout(updateProductEditPreview, 100);
      }
    });
    
    // Reset functionality
    const resetButtons = document.querySelectorAll('.reset-btn');
    resetButtons.forEach(button => {
      button.onclick = function() {
        const productId = this.getAttribute('data-id');
        const productName = this.getAttribute('data-name');
        
        document.getElementById('resetModalProduct').textContent = productName;
        
        resetModal.style.display = 'block';
      }
    });
    
    // Cancel buttons
    document.getElementById('editCancel').onclick = function() {
      editModal.style.display = 'none';
    }
    
    document.getElementById('resetCancel').onclick = function() {
      resetModal.style.display = 'none';
    }
    
    document.getElementById('scheduleCancel').onclick = function() {
      scheduleModal.style.display = 'none';
    }
    
    // Function for real-time edit preview updates for products
    function updateProductEditPreview() {
      const title = document.getElementById('editTitle').value;
      const description = document.getElementById('editDescription').value;
      const productName = document.getElementById('editModalProduct').textContent;
      
      // Update the preview in real-time
      document.getElementById('editPreviewTitle').textContent = title
        .replace(/{{productTitle}}/g, productName)
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{storeName}}/g, 'Your Store');
      
      document.getElementById('editPreviewDescription').textContent = description
        .replace(/{{productTitle}}/g, productName)
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{if hasDiscount}}/g, '')
        .replace(/{{discountPercentage}}/g, '25%')
        .replace(/{{else}}/g, '')
        .replace(/{{productVendor}}/g, 'Fashion Brand')
        .replace(/{{endif}}/g, '');
    }
    
    // Add input event listeners for real-time preview updates
    document.getElementById('editTitle').addEventListener('input', updateProductEditPreview);
    document.getElementById('editDescription').addEventListener('input', updateProductEditPreview);
    
    // Function for real-time product schedule preview updates
    function updateProductSchedulePreview() {
      const title = document.getElementById('scheduleTitle').value;
      const description = document.getElementById('scheduleDescription').value;
      
      // Update preview in real-time
      document.getElementById('schedulePreviewTitle').textContent = title
        .replace(/{{productTitle}}/g, 'Premium Cotton T-Shirt')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{storeName}}/g, 'Your Store');
      
      document.getElementById('schedulePreviewDescription').textContent = description
        .replace(/{{productTitle}}/g, 'Premium Cotton T-Shirt')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{discountPercentage}}/g, '25%');
    }
    
    // Add input event listeners for real-time preview
    document.getElementById('scheduleTitle').addEventListener('input', updateProductSchedulePreview);
    document.getElementById('scheduleDescription').addEventListener('input', updateProductSchedulePreview);
    
    // Initialize preview when modal opens
    document.getElementById('scheduleNewChange').addEventListener('click', function() {
      setTimeout(updateProductSchedulePreview, 100);
    });
    
    // Form submissions
    document.getElementById('editForm').onsubmit = async function(e) {
      e.preventDefault();
      
      const productId = document.getElementById('editProductId').value;
      const title = document.getElementById('editTitle').value;
      const description = document.getElementById('editDescription').value;
      
      // In a real app, we would save the data via API
      alert('Changes saved successfully!');
      editModal.style.display = 'none';
    }
    
    document.getElementById('scheduleForm').onsubmit = async function(e) {
      e.preventDefault();
      
      const title = document.getElementById('scheduleTitle').value;
      const description = document.getElementById('scheduleDescription').value;
      const startDate = document.getElementById('scheduleStart').value;
      const endDate = document.getElementById('scheduleEnd').value;
      
      // In a real app, we would schedule via API
      alert('Changes scheduled successfully!');
      scheduleModal.style.display = 'none';
    }
    
    document.getElementById('resetConfirm').onclick = async function() {
      // In a real app, we would reset via API
      alert('Product reset to global templates');
      resetModal.style.display = 'none';
    }
    
    // Close modals when clicking outside
    window.onclick = function(event) {
      if (event.target == editModal) {
        editModal.style.display = 'none';
      } else if (event.target == resetModal) {
        resetModal.style.display = 'none';
      } else if (event.target == scheduleModal) {
        scheduleModal.style.display = 'none';
      }
    }
  
    // Variable insertion functions
    function insertVariable(textareaId, variable) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      
      // Insert variable at cursor position
      textarea.value = textarea.value.substring(0, startPos) + 
                       variable + 
                       textarea.value.substring(endPos);
      
      // Move cursor after the inserted variable
      textarea.selectionStart = textarea.selectionEnd = startPos + variable.length;
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    
    function insertModifier(textareaId, modifier) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const beforeCursor = textarea.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          textarea.value = textarea.value.substring(0, variableEndPos) + 
                           modifier +
                           textarea.value.substring(variableEndPos, textarea.value.length);
          textarea.selectionStart = textarea.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
          textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
        textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
      }
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
  </script>
</body>
</html>
`;

// Home page route (authenticated)
app.get('/', async (req, res) => {
  const shop = req.query.shop || process.env.SHOP;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter. Please add ?shop=your-shop.myshopify.com to the URL.');
  }
  
  // For development, we'll temporarily skip authentication checks
  const skipAuth = process.env.NODE_ENV === 'development';
  
  // Check if we have a session for this shop
  const sessionKey = `${shop}_offline`;
  const session = SESSION_STORAGE.get(sessionKey);
  
  if (!skipAuth && !session) {
    // Not authenticated, redirect to auth
    return res.redirect(`/auth?shop=${shop}`);
  }
  
  // Serve the dashboard HTML
  res.send(dashboardHTML);
});

// Templates route
app.get('/templates', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(templatesHTML);
});

// Collections route
app.get('/collections', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(collectionsHTML);
});

// Products route
app.get('/products', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(productsHTML);
});

// Create a simple homepage meta fields HTML
const homepageHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Home Page Settings - Meta Maximus</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f6f6f7;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.05);
      margin-bottom: 20px;
      padding: 20px;
    }
    .nav {
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    }
    .nav a {
      padding: 10px 15px;
      background: #5c6ac4;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }
    textarea {
      width: 100%;
      padding: 10px;
      border-radius: 4px;
      border: 1px solid #ddd;
      min-height: 100px;
      margin-bottom: 5px;
    }
    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }
    button {
      padding: 10px 15px;
      background: #5c6ac4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .badge.good {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }
    .badge.bad {
      background: #ffd2d2;
      color: #bf0711;
    }
    
    
    .character-count {
      font-size: 12px;
      margin-bottom: 15px;
      color: #637381;
    }
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 12px;
      margin-bottom: 10px;
    }
    .badge.good {
      background: #c9e8d1;
      color: #108043;
    }
    .badge.warning {
      background: #ffea8a;
      color: #8a6116;
    }
    .badge.bad {
      background: #ffd2d2;
      color: #bf0711;
    }
    h1, h2, h3 {
      margin-top: 0;
    }
    .preview-section {
      margin-top: 20px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      background: #fff;
    }
    .google-preview {
      margin-top: 20px;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
      background: #f9f9f9;
      max-width: 600px;
      font-family: arial, sans-serif;
    }
    .google-preview-title {
      color: #1a0dab;
      font-size: 18px;
      margin-bottom: 3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .google-preview-url {
      color: #006621;
      font-size: 14px;
      margin-bottom: 3px;
    }
    .google-preview-description {
      color: #545454;
      font-size: 14px;
      line-height: 1.4;
    }
    .modal {
      display: none;
      position: fixed;
      z-index: 1;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: auto;
      background-color: rgba(0,0,0,0.4);
    }
    .modal-content {
      background-color: #fefefe;
      margin: 10% auto;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
      width: 50%;
      max-width: 600px;
    }
    .close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    .close:hover {
      color: black;
    }
    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
    .button {
      padding: 6px 12px;
      background: #5c6ac4;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      display: inline-block;
    }
    .button.secondary {
      background: #f4f6f8;
      color: #212b36;
      border: 1px solid #c4cdd5;
    }
    .date-picker {
      padding: 8px;
      border-radius: 4px;
      border: 1px solid #ddd;
      margin-bottom: 15px;
    }
  
    /* Badge-style variable buttons */
    .variable-buttons {
      margin: 4px 0 6px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    
    /* Badge-style buttons */
    .badge-button {
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 500;
      border: none;
      border-radius: 12px; /* Fully rounded corners */
      cursor: pointer;
      transition: all 0.2s;
    }
    
    /* Regular variables */
    .badge-button.var {
      background-color: #e0e5f0;
      color: #5c6ac4;
    }
    .badge-button.var:hover {
      background-color: #c9cfe0;
    }
    
    /* Primary variables */
    .badge-button.primary {
      background-color: #eaf5fe;
      color: #007ace;
    }
    .badge-button.primary:hover {
      background-color: #b4dbf7;
    }
    
    /* Conditional logic */
    .badge-button.conditional {
      background-color: #e3f1df;
      color: #108043;
    }
    .badge-button.conditional:hover {
      background-color: #bbe5b3;
    }
    
    /* Format modifiers */
    .badge-button.format {
      background-color: #f6f0fd;
      color: #9c6ade;
    }
    .badge-button.format:hover {
      background-color: #e3d0ff;
    }
    
    /* Discount variables */
    .badge-button.discount {
      background-color: #fdf6e3;
      color: #daa520;
    }
    .badge-button.discount:hover {
      background-color: #f9e9c0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Home Page Settings</h1>
    
    <div class="nav">
      <a href="/">Home</a>
      <a href="/homepage">Home Page Settings</a>
      <a href="/collections">Collection Settings</a>
      <a href="/products">Product Settings</a>
    </div>
    
    <!-- Global Settings Info Card -->
    <div class="card">
      <h2>Global Home Page Settings</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        These are your default settings that will override the settings in Shopify. 
        It might take several days before the results appear in Google search results, 
        depending on how often Google indexes your site.
      </p>
      
      <div>
        <label for="homeTitle">Meta Title Template</label>
        <div class="variable-buttons">
          <!-- Common variables -->
          <button type="button" class="badge-button var" onclick="insertVariable('homeTitle', '{{shopifyTitle}}')">DEFAULT</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{year}}')">YEAR</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{month}}')">MONTH</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{season}}')">SEASON</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeTitle', '{{storeName}}')">STORE</button>
          <!-- Conditionals -->
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{if condition}}')">IF</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{else}}')">ELSE</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeTitle', '{{endif}}')">ENDIF</button>
          
          <!-- Format modifiers -->
          <button type="button" class="badge-button format" onclick="insertModifier('homeTitle', ':initialCaps')">INITIAL CAPS</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeTitle', ':uppercase')">UPPER</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeTitle', ':lowercase')">LOWER</button>
        </div>
        <input type="text" id="homeTitle" value="{{storeName}} - {{season}} {{year}} Collection" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        
        <div class="character-count">
          <span id="homeTitleCount">43</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div>
        <label for="homeDescription">Meta Description Template</label>
        <div class="variable-buttons">
          <!-- Common variables -->
          <button type="button" class="badge-button var" onclick="insertVariable('homeDescription', '{{shopifyDescription}}')">DEFAULT</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{year}}')">YEAR</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{month}}')">MONTH</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{season}}')">SEASON</button>
          <button type="button" class="badge-button primary" onclick="insertVariable('homeDescription', '{{storeName}}')">STORE</button>
          <!-- Conditionals -->
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{if hasDiscount}}')">IF DISCOUNT</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{else}}')">ELSE</button>
          <button type="button" class="badge-button conditional" onclick="insertVariable('homeDescription', '{{endif}}')">ENDIF</button>
          <!-- Special variables -->
          <button type="button" class="badge-button var" onclick="insertVariable('homeDescription', '{{maxDiscountPercentage}}')">DISCOUNT%</button>
          
          <!-- Format modifiers -->
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':initialCaps')">INITIAL CAPS</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':uppercase')">UPPER</button>
          <button type="button" class="badge-button format" onclick="insertModifier('homeDescription', ':lowercase')">LOWER</button>
        </div>
        <textarea id="homeDescription">Shop our collection of quality products. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} off with our current sale!{{else}}New items added regularly.{{endif}}</textarea>
        
        <div class="character-count">
          <span id="homeDescriptionCount">110</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div style="margin-top: 15px;">
        <button id="saveHomeBtn">Save Home Page Templates</button>
      </div>
    </div>
    
    <!-- Search Preview -->
    <div class="card preview-section" id="searchPreview">
      <h3>Google Search Preview</h3>
      <div class="google-preview">
        <div class="google-preview-title" id="previewTitle">Your Store: Quality Products for 2025</div>
        <div class="google-preview-url">https://your-store.myshopify.com/</div>
        <div class="google-preview-description" id="previewDescription">
          Shop our collection of quality products. Save up to 30% off with our current sale!
        </div>
      </div>
    </div>
    
    <!-- Scheduler Section -->
    <div class="card">
      <h2>Scheduled Global Template Changes</h2>
      <p style="color: #637381; margin-bottom: 15px;">
        Schedule updates to your home page meta tags to automatically go live on a specific date.
        Perfect for seasonal promotions and sales events.
      </p>
      
      <button id="scheduleNewChange" style="margin-bottom: 20px;">Schedule a Template Change</button>
      
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd;">Name</th>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd;">Description</th>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd;">Status</th>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd;">Schedule</th>
            <th style="text-align: left; padding: 10px; border-bottom: 1px solid #ddd;">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <div style="font-weight: bold;">Summer Sale 2025</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Special meta tags for summer sale promotion</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><span class="badge green">Active</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">May 1 - Jun 30, 2025</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <button class="edit-btn" data-id="summer-sale" data-name="Summer Sale 2025">Edit</button>
              <button class="pause-btn" data-id="summer-sale" data-name="Summer Sale 2025">Pause</button>
              <button class="reset-btn" data-id="summer-sale" data-name="Summer Sale 2025" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <div style="font-weight: bold;">Holiday Season</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Holiday themed meta tags and descriptions</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><span class="badge blue">Scheduled</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Starts Nov 15, 2025</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <button class="edit-btn" data-id="holiday-season" data-name="Holiday Season">Edit</button>
              <button class="pause-btn" data-id="holiday-season" data-name="Holiday Season">Pause</button>
              <button class="reset-btn" data-id="holiday-season" data-name="Holiday Season" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <div style="font-weight: bold;">Spring Collection</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Spring-themed promotional meta tags</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><span class="badge warning">Paused</span></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">Mar 1 - Apr 30, 2025</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">
              <button class="edit-btn" data-id="spring-collection" data-name="Spring Collection">Edit</button>
              <button class="resume-btn" data-id="spring-collection" data-name="Spring Collection" style="background: #50b83c;">Resume</button>
              <button class="reset-btn" data-id="spring-collection" data-name="Spring Collection" style="background: #fd5749;">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Variable Reference Card -->
    <div class="card">
      <h2>Variable Reference</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <h3>Basic Variables</h3>
          <ul>
            <li><code>{{year}}</code> - Current year (e.g., 2025)</li>
            <li><code>{{season}}</code> - Current season (Spring, Summer, Fall, Winter)</li>
          </ul>
          
          <h3>Store Variables</h3>
          <ul>
            <li><code>{{storeName}}</code> - Your store's name</li>
            <li><code>{{storeDomain}}</code> - Store domain</li>
            <li><code>{{totalProducts}}</code> - Total number of products</li>
          </ul>
        </div>
        
        <div>
          <h3>Discount Variables</h3>
          <ul>
            <li><code>{{maxDiscountPercentage}}</code> - Highest discount percentage</li>
            <li><code>{{discountRange}}</code> - Range of discounts (e.g., "20-50%")</li>
            <li><code>{{hasDiscount}}</code> - Boolean flag for discounts</li>
            <li><code>{{discountedCount}}</code> - Number of discounted products</li>
            <li><code>{{avgDiscount}}</code> - Average discount percentage</li>
          </ul>
          
          <h3>Format Modifiers</h3>
          <ul>
            <li><code>{{variable:lowercase}}</code> - Convert to lowercase</li>
            <li><code>{{variable:uppercase}}</code> - Convert to uppercase</li>
          </ul>
          
          <h3>Conditional Logic</h3>
          <p><code>{{if hasDiscount}}On Sale!{{else}}Regular Price{{endif}}</code></p>
        </div>
      </div>
    </div>
  </div>
  
  <script>
    // Fix badge styling to ensure consistency 
    document.addEventListener('DOMContentLoaded', function() {
      // Add blue and green classes to supplement good/bad classes
      const styleSheet = document.createElement('style');
      styleSheet.innerText = ".badge.green { background: #c9e8d1; color: #108043; } .badge.blue { background: #d4e8f7; color: #1c6da3; }";
      document.head.appendChild(styleSheet);
    });
    
    // Function to update the Google preview
    function updateHomePreview() {
      const title = document.getElementById('homeTitle').value
        .replace('{{storeName}}', 'Your Store')
        .replace('{{season}}', 'Summer')
        .replace('{{year}}', '2025');
      
      const description = document.getElementById('homeDescription').value
        .replace('{{if hasDiscount}}', '')
        .replace('{{maxDiscountPercentage}}', '30%')
        .replace('{{else}}', '')
        .replace('{{endif}}', '');
      
      document.getElementById('previewTitle').textContent = title;
      document.getElementById('previewDescription').textContent = description;
    }

    // Character counter and real-time preview for title
    document.getElementById('homeTitle').addEventListener('input', function() {
      document.getElementById('homeTitleCount').textContent = this.value.length;
      updateHomePreview();
    });
    
    // Character counter and real-time preview for description
    document.getElementById('homeDescription').addEventListener('input', function() {
      document.getElementById('homeDescriptionCount').textContent = this.value.length;
      updateHomePreview();
    });
    
    // Initial preview on page load
    updateHomePreview();
    
    // Save button
    document.getElementById('saveHomeBtn').addEventListener('click', function() {
      // In a real app, this would save to the server
      alert('Home page templates saved successfully!');
    });
    
    // Schedule modal functionality
    const scheduleModal = document.getElementById('scheduleModal');
    
    // Schedule new changes
    document.getElementById('scheduleNewChange').addEventListener('click', function() {
      // Set default schedule date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      document.getElementById('scheduleStart').valueAsDate = tomorrow;
      
      // Clear form fields or set defaults
      document.getElementById('scheduleName').value = '';
      
      // Show the modal
      scheduleModal.style.display = 'block';
    });
    
    // Schedule cancel
    document.getElementById('scheduleCancel').addEventListener('click', function() {
      scheduleModal.style.display = 'none';
    });
    
    // Function to update schedule preview in real-time
    function updateSchedulePreview() {
      const title = document.getElementById('scheduleTitle').value
        .replace(/{{storeName}}/g, 'Your Store')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{maxDiscountPercentage}}/g, '30%');
      
      const description = document.getElementById('scheduleDescription').value
        .replace(/{{storeName}}/g, 'Your Store')
        .replace(/{{season}}/g, 'Summer')
        .replace(/{{year}}/g, '2025')
        .replace(/{{maxDiscountPercentage}}/g, '30%');
      
      document.getElementById('schedulePreviewTitle').textContent = title;
      document.getElementById('schedulePreviewDescription').textContent = description;
    }
    
    // Real-time preview on input
    document.getElementById('scheduleTitle').addEventListener('input', updateSchedulePreview);
    document.getElementById('scheduleDescription').addEventListener('input', updateSchedulePreview);
    
    // Initial preview when modal opens
    document.addEventListener('DOMContentLoaded', function() {
      const scheduleNewChange = document.getElementById('scheduleNewChange');
      if (scheduleNewChange) {
        scheduleNewChange.addEventListener('click', function() {
          setTimeout(updateSchedulePreview, 100); // Short delay to ensure fields are ready
        });
      }
      
      // Also update when edit buttons are clicked
      document.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
          setTimeout(updateSchedulePreview, 100);
        });
      });
    });
    
    // Schedule submit
    document.getElementById('scheduleForm').addEventListener('submit', function(e) {
      e.preventDefault();
      
      // In a real app, we would save to the server
      alert('Schedule saved successfully!');
      scheduleModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.onclick = function(event) {
      if (event.target == scheduleModal) {
        scheduleModal.style.display = 'none';
      }
    };
    
    // Edit scheduled item
    document.querySelectorAll('.edit-btn').forEach(button => {
      button.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        
        // In a real app, we would fetch the schedule data
        // For demo, we'll just show the modal with sample data
        document.getElementById('scheduleName').value = this.closest('tr').querySelector('div').textContent;
        
        // Show the modal
        scheduleModal.style.display = 'block';
      });
    });
    
    // Pause scheduled item
    document.querySelectorAll('.pause-btn').forEach(button => {
      button.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const row = this.closest('tr');
        
        // In a real app, we would update the server
        // For demo, just update the UI
        const badgeElement = row.querySelector('.badge');
        badgeElement.className = 'badge warning';
        badgeElement.textContent = 'Paused';
        
        // Replace pause button with resume button
        const pauseBtn = row.querySelector('.pause-btn');
        const td = pauseBtn.parentNode;
        
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'resume-btn';
        resumeBtn.setAttribute('data-id', id);
        resumeBtn.style.background = '#50b83c';
        resumeBtn.textContent = 'Resume';
        resumeBtn.addEventListener('click', resumeHandler);
        
        td.replaceChild(resumeBtn, pauseBtn);
        
        alert('Schedule paused successfully.');
      });
    });
    
    // Resume scheduled item
    const resumeHandler = function() {
      const id = this.getAttribute('data-id');
      const row = this.closest('tr');
      
      // Check if it's in the future or current
      const scheduleText = row.querySelector('td:nth-child(3)').textContent;
      let badgeClass = 'blue';
      let badgeText = 'Scheduled';
      
      if (scheduleText.includes('- ')) {
        const dates = scheduleText.split(' - ');
        const startDate = new Date(dates[0]);
        const endDate = new Date(dates[1]);
        const today = new Date();
        
        if (startDate <= today && (endDate >= today || !dates[1])) {
          badgeClass = 'green';
          badgeText = 'Active';
        }
      }
      
      // Update UI
      const badgeElement = row.querySelector('.badge');
      badgeElement.className = 'badge ' + (badgeClass === 'gray' ? 'warning' : badgeClass);
      badgeElement.textContent = badgeText;
      
      // Replace resume button with pause button
      const resumeBtn = row.querySelector('.resume-btn');
      const td = resumeBtn.parentNode;
      
      const pauseBtn = document.createElement('button');
      pauseBtn.className = 'pause-btn';
      pauseBtn.setAttribute('data-id', id);
      pauseBtn.textContent = 'Pause';
      pauseBtn.addEventListener('click', function() {
        // Same as the pause handler above
        const id = this.getAttribute('data-id');
        const row = this.closest('tr');
        
        row.querySelector('.badge').className = 'badge warning';
        row.querySelector('.badge').textContent = 'Paused';
        
        const pauseBtn = row.querySelector('.pause-btn');
        const td = pauseBtn.parentNode;
        
        const resumeBtn = document.createElement('button');
        resumeBtn.className = 'resume-btn';
        resumeBtn.setAttribute('data-id', id);
        resumeBtn.style.background = '#50b83c';
        resumeBtn.textContent = 'Resume';
        resumeBtn.addEventListener('click', resumeHandler);
        
        td.replaceChild(resumeBtn, pauseBtn);
        
        alert('Schedule paused successfully.');
      });
      
      td.replaceChild(pauseBtn, resumeBtn);
      
      alert('Schedule resumed successfully.');
    };
    
    // Add event listeners to any existing resume buttons
    document.querySelectorAll('.resume-btn').forEach(button => {
      button.addEventListener('click', resumeHandler);
    });
    
    // Delete scheduled item
    document.querySelectorAll('.reset-btn').forEach(button => {
      button.addEventListener('click', function() {
        if (confirm('Are you sure you want to delete this scheduled change?')) {
          const row = this.closest('tr');
          row.parentNode.removeChild(row);
          
          // In a real app, we would send a delete request to the server
          alert('Schedule deleted successfully.');
        }
      });
    });
  
    // Variable insertion functions
    function insertVariable(textareaId, variable) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      
      // Insert variable at cursor position
      textarea.value = textarea.value.substring(0, startPos) + 
                       variable + 
                       textarea.value.substring(endPos);
      
      // Move cursor after the inserted variable
      textarea.selectionStart = textarea.selectionEnd = startPos + variable.length;
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
    
    function insertModifier(textareaId, modifier) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get cursor position
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      const beforeCursor = textarea.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          textarea.value = textarea.value.substring(0, variableEndPos) + 
                           modifier +
                           textarea.value.substring(variableEndPos, textarea.value.length);
          textarea.selectionStart = textarea.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
          textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        textarea.value = beforeCursor + modifier + textarea.value.substring(endPos);
        textarea.selectionStart = textarea.selectionEnd = startPos + modifier.length;
      }
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }
  
    // Format modifier insertion function
    function insertModifier(textareaId, modifier) {
      const textarea = document.getElementById(textareaId);
      if (!textarea) return;
      
      // Get the selected text
      const startPos = textarea.selectionStart;
      const endPos = textarea.selectionEnd;
      
      // Check if there's any selection
      if (startPos === endPos) {
        // No selection, notify user
        alert("Please select some text or a variable to apply the modifier.");
        return;
      }
      
      const selectedText = textarea.value.substring(startPos, endPos);
      
      // Check if selection is a variable or contains a variable
      if (selectedText.includes('{{') && selectedText.includes('}}')) {
        // Add modifier before the closing }}
        const modifiedText = selectedText.replace(/}}(?=[^}]*$)/, modifier + '}}');
        
        // Replace the selected text with the modified version
        textarea.value = textarea.value.substring(0, startPos) + modifiedText + textarea.value.substring(endPos);
        
        // Update selection to include the modification
        textarea.selectionStart = startPos;
        textarea.selectionEnd = startPos + modifiedText.length;
      } else {
        // Wrap selected text in {{ }} with modifier
        const modifiedText = '{{' + selectedText + modifier + '}}';
        
        // Replace the selected text with the modified version
        textarea.value = textarea.value.substring(0, startPos) + modifiedText + textarea.value.substring(endPos);
        
        // Update selection to include the modification
        textarea.selectionStart = startPos;
        textarea.selectionEnd = startPos + modifiedText.length;
      }
      
      // Focus back on textarea
      textarea.focus();
      
      // Trigger input event to update character count if needed
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
    }</script>
  
  <!-- Schedule Modal -->
  <div id="scheduleModal" class="modal">
    <div class="modal-content">
      <span class="close">&times;</span>
      <h2>Schedule Template Changes</h2>
      
      <form id="scheduleForm">
        <div style="margin-bottom: 15px;">
          <label for="scheduleName">Schedule Name</label>
          <input type="text" id="scheduleName" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd;" placeholder="e.g., Summer Sale 2025">
        </div>
        
        <div>
          <label for="scheduleTitle">Meta Title Template</label>
          <!-- Badge-style Variable Buttons for Title -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleTitle', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleTitle', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleTitle', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleTitle', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleTitle', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleTitle', ':lowercase')">LOWER</button>
          </div>
          <input type="text" id="scheduleTitle" value="{{storeName}} - SALE! Up to {{maxDiscountPercentage}} OFF {{season}} {{year}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="scheduleDescription">Meta Description Template</label>
          <!-- Badge-style Variable Buttons for Description -->
          <div class="variable-buttons">
            <!-- Common variables -->
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{year}}')">YEAR</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{month}}')">MONTH</button>
            <button type="button" class="badge-button primary" onclick="insertVariable('scheduleDescription', '{{season}}')">SEASON</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{date}}')">DATE</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{productTitle}}')">PRODUCT</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{collectionTitle}}')">COLLECTION</button>
            <button type="button" class="badge-button var" onclick="insertVariable('scheduleDescription', '{{storeName}}')">STORE</button>
            
            <!-- Conditional logic -->
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleDescription', '{{if hasDiscount}}...{{endif}}')">IF</button>
            <button type="button" class="badge-button conditional" onclick="insertVariable('scheduleDescription', '{{if hasDiscount}}...{{else}}...{{endif}}')">IF/ELSE</button>
            
            <!-- Format modifiers -->
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleDescription', ':uppercase')">UPPER</button>
            <button type="button" class="badge-button format" onclick="insertModifier('scheduleDescription', ':lowercase')">LOWER</button>
            
            <!-- Discount variables -->
            <button type="button" class="badge-button discount" onclick="insertVariable('scheduleDescription', '{{maxDiscountPercentage}}')">MAX %</button>
            <button type="button" class="badge-button discount" onclick="insertVariable('scheduleDescription', '{{discountRange}}')">RANGE</button>
          </div>
          <textarea id="scheduleDescription">Limited time offer: Save up to {{maxDiscountPercentage}} on our {{season}} collection. Shop now before the sale ends!</textarea>
        </div>
        
        <div style="display: flex; gap: 15px; margin-bottom: 20px; margin-top: 20px;">
          <div style="flex: 1;">
            <label for="scheduleStart">Start Date</label>
            <input type="date" id="scheduleStart" class="date-picker" style="width: 100%;">
          </div>
          <div style="flex: 1;">
            <label for="scheduleEnd">End Date (Optional)</label>
            <input type="date" id="scheduleEnd" class="date-picker" style="width: 100%;">
            <div style="font-size: 12px; color: #637381; margin-top: 5px;">Leave empty for no end date</div>
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <div style="margin-bottom: 10px;">
            <input type="checkbox" id="scheduleOverrideGlobal" checked>
            <label for="scheduleOverrideGlobal" style="display: inline; font-weight: normal;">Override global settings</label>
          </div>
        </div>
        
        <div class="google-preview">
          <h3>Search Preview</h3>
          <div class="google-preview-title" id="schedulePreviewTitle">Your Store - SALE! Up to 30% OFF Summer 2025</div>
          <div class="google-preview-url">https://your-store.myshopify.com/</div>
          <div class="google-preview-description" id="schedulePreviewDescription">
            Limited time offer: Save up to 30% on our Summer collection. Shop now before the sale ends!
          </div>
        </div>
        
        <div class="form-actions">
          <button type="button" class="button secondary" id="scheduleCancel">Cancel</button>
          <button type="submit" class="button">Schedule Changes</button>
        </div>
      </form>
    </div>
  </div>
</body>
</html>
`;

// Auth middleware for app routes
const authMiddleware = async (req, res, next) => {
  // Check if this is an embedded request (has host parameter)
  const isEmbedded = !!req.query.host;
  const shop = req.query.shop || process.env.SHOP;
  
  console.log(`Auth middleware check for shop: ${shop}, embedded: ${isEmbedded}`);
  
  // Special handling for embedded requests - they always need to pass through
  // as they'll be redirected to auth if needed inside the app itself
  if (isEmbedded) {
    console.log('Embedded app request detected, allowing through middleware');
    // No session checks for embedded requests from Shopify Admin
    return next();
  }
  
  // If no shop is provided on a direct access, redirect to install page
  if (!shop) {
    console.log('No shop provided, redirecting to install page');
    return res.redirect('/install');
  }
  
  // At this point, we have a shop and it's a direct access (not embedded)
  // So we need to check for a valid session
  let session;
  
  // Try to load from MongoDB
  try {
    const database = require('../src/services/database');
    session = await database.loadSession(shop);
    if (session) {
      console.log(`Found MongoDB session for shop: ${shop}`);
    }
  } catch (dbError) {
    console.error('Error loading session from MongoDB:', dbError);
  }
  
  // Fall back to in-memory storage if not found in MongoDB
  if (!session) {
    const sessionKey = `${shop}_offline`;
    session = SESSION_STORAGE.get(sessionKey);
    if (session) {
      console.log(`Found in-memory session for shop: ${shop}`);
    }
  }
  
  // If no session found, redirect to auth
  if (!session) {
    console.log(`No session found for shop: ${shop}, redirecting to auth`);
    return res.redirect(`/auth?shop=${encodeURIComponent(shop)}`);
  }
  
  // Set session and continue
  req.shopifySession = session;
  next();
};

// Protected routes
app.get('/', (req, res) => {
  // The root route is special - we need to handle both authenticated access
  // and initial installation flows differently
  
  const { shop, host, hmac, timestamp } = req.query;
  const currentTimestamp = Date.now();
  
  // DETAILED DEBUG LOGGING
  console.log('\n================ ROOT ROUTE ACCESS ================');
  console.log('Time:', new Date().toISOString());
  console.log('Query Parameters:');
  console.log('- shop:', shop);
  console.log('- host:', host);
  console.log('- hmac:', hmac ? hmac.substring(0, 10) + '...' : 'none');
  console.log('- timestamp:', timestamp);
  console.log('Request Headers:');
  console.log('- User-Agent:', req.headers['user-agent']);
  console.log('- Referer:', req.headers['referer']);
  console.log('Session Info:');
  console.log('- Has shopifySession:', !!req.shopifySession);
  if (req.shopifySession) {
    console.log('- Session shop:', req.shopifySession.shop);
    console.log('- Session scope:', req.shopifySession.scope);
  }
  console.log('=================================================\n');
  
  // IMPORTANT LOGIC FOR SHOPIFY APP INTEGRATION:
  
  // 1. Handle direct (non-embedded) visits WITHOUT shop parameter - serve the app landing page
  if (!shop && !host) {
    // This is direct access to the app URL without shop or host parameters
    // For first-time users, show the landing page with installation instructions
    console.log('DIRECT ACCESS: Serving landing page');
    
    // Redirecting to /install is more straightforward than serving the homepage
    return res.redirect('/install');
  }
  
  // 2. Handle direct access WITH shop parameter but NO session
  // This is likely direct access during installation process or an expired session
  if (shop && !host && !req.shopifySession) {
    console.log(`INSTALLATION FLOW DETECTED - Redirecting to auth for shop: ${shop}`);
    return res.redirect(`/auth?shop=${encodeURIComponent(shop)}`);
  }
  
  // 3. Handle embedded app context (from Shopify admin)
  if (host) {
    console.log(`EMBEDDED APP MODE - Serving app for shop: ${shop}, host: ${host}`);
    
    // 3a. If no session in embedded mode, start auth flow
    if (shop && !req.shopifySession) {
      console.log(`No session found for embedded app. Initiating auth flow for: ${shop}`);
      return res.redirect(`/auth?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host)}`);
    }
    
    // 3b. We have a valid session and host parameter - we're in the Shopify Admin!
    
    // Add App Bridge script tag and initialization to the HTML
    // This is critical for embedded apps to communicate with Shopify admin
    const embeddedAppHtml = dashboardHTML.replace('</head>', `
      <!-- Shopify App Bridge -->
      <script src="https://unpkg.com/@shopify/app-bridge@3"></script>
      <script src="https://unpkg.com/@shopify/app-bridge-utils@3"></script>
      <script>
        // Debug info in browser console
        console.log('DEBUG INFO:');
        console.log('API Key:', '${process.env.SHOPIFY_API_KEY}');
        console.log('Host:', '${host}');
        console.log('Shop:', '${shop}');
        
        try {
          // Proper App Bridge initialization using the latest approach
          window.shopify = {
            config: {
              apiKey: '${process.env.SHOPIFY_API_KEY}',
              host: '${host}',
              forceRedirect: true
            }
          };
          
          // Initialize App Bridge
          var AppBridge = window['app-bridge'];
          var createApp = AppBridge.default;
          var actions = window['app-bridge'].actions;
          var app = createApp(window.shopify.config);
          
          // Get the redirect helper
          var Redirect = actions.Redirect;
          var redirect = Redirect.create(app);
          
          // Helper function for additional auth if needed
          function startAuth() {
            redirect.dispatch(Redirect.Action.REMOTE, '/auth?shop=${encodeURIComponent(shop)}');
          }
          
          console.log('App Bridge initialized successfully');
          
          // Add standard App Bridge utilities for navigation
          var actions = window['app-bridge'].actions;
          
          // Set up title bar
          var TitleBar = actions.TitleBar;
          var titleBarOptions = {
            title: 'Meta Maximus SEO',
          };
          var myTitleBar = TitleBar.create(app, titleBarOptions);
          
          // Only add debugging in development mode
          if (process.env.NODE_ENV === 'development') {
            document.addEventListener('DOMContentLoaded', function() {
              var debugDiv = document.createElement('div');
              debugDiv.style.padding = '15px';
              debugDiv.style.margin = '15px 0';
              debugDiv.style.background = '#f0f0f0';
              debugDiv.style.border = '1px solid #ccc';
              debugDiv.style.borderRadius = '4px';
              debugDiv.innerHTML = '<h3>Installation Debug Info</h3>' + 
                                '<p><strong>Shop:</strong> ${shop}</p>' + 
                                '<p><strong>API Key:</strong> ${process.env.SHOPIFY_API_KEY}</p>' + 
                                '<p><strong>Host:</strong> ${host}</p>';
              
              document.body.insertBefore(debugDiv, document.body.firstChild);
              
              // Add buttons for debugging
              var authButton = document.createElement('button');
              authButton.innerText = 'Manually Start Auth Flow';
              authButton.style = 'display: block; margin: 20px auto; padding: 10px 20px; background: #5c6ac4; color: white; border: none; border-radius: 4px; text-align: center; max-width: 300px; cursor: pointer;';
              authButton.onclick = function() {
                console.log('Starting auth flow using App Bridge');
                startAuth();
              };
              document.body.prepend(authButton);
              
              // Add diagnostic button
              var diagButton = document.createElement('button');
              diagButton.innerText = 'Check App Status';
              diagButton.style = 'display: block; margin: 20px auto; padding: 10px 20px; background: #007755; color: white; border: none; border-radius: 4px; text-align: center; max-width: 300px; cursor: pointer;';
              diagButton.onclick = function() {
                var diagInfo = document.createElement('div');
                diagInfo.style = 'padding: 15px; margin: 15px; background: #fff; border: 1px solid #ddd; border-radius: 4px;';
                diagInfo.innerHTML = '<h3>App Bridge Status</h3>' +
                                  '<p>App Bridge Loaded: ' + (typeof AppBridge !== 'undefined') + '</p>' +
                                  '<p>App Initialized: ' + (typeof app !== 'undefined') + '</p>' +
                                  '<p>Is Embedded: ' + (window.self !== window.top) + '</p>';
                document.body.prepend(diagInfo);
              };
              document.body.prepend(diagButton);
            });
          }
        } catch (e) {
          console.error('Error initializing App Bridge:', e);
        }
      </script>
      </head>
    `);
    
    res.send(embeddedAppHtml);
  } else {
    // Direct access (no host parameter)
    if (!req.shopifySession) {
      console.log('DIRECT ACCESS - No session, showing welcome page');
      res.send(dashboardHTML);
    } else {
      console.log('DIRECT ACCESS - With session, showing dashboard');
      res.send(dashboardHTML);
    }
  }
});

// Serve homepage without auth middleware like other routes
app.get('/homepage', (req, res) => {
  res.send(homepageHTML);
});

// Apply auth middleware to other routes
app.get('/collections', authMiddleware, (req, res) => {
  res.send(collectionsHTML);
});

app.get('/products', authMiddleware, (req, res) => {
  res.send(productsHTML);
});

app.get('/templates', authMiddleware, (req, res) => {
  res.send(templatesHTML);
});

// Start scheduler service only in production
// For development, we can manually trigger it via API
if (process.env.NODE_ENV === 'production') {
  scheduler.startScheduler();
}

// API endpoint to check scheduler status
app.get('/api/scheduler/status', (req, res) => {
  res.json(scheduler.getSchedulerStatus());
});

// API endpoint to manually trigger scheduler check
app.post('/api/scheduler/run', async (req, res) => {
  try {
    await scheduler.checkScheduledChanges();
    res.json({ success: true, message: 'Scheduler check triggered successfully' });
  } catch (error) {
    console.error('Error triggering scheduler check:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Meta Maximus app listening at http://localhost:${port} (Port: ${port})`);
});