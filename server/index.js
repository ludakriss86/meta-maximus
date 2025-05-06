require('dotenv').config();
// Import the adapter before anything else
require('@shopify/shopify-api/adapters/node');
const express = require('express');
const { shopifyApi, ApiVersion, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { join } = require('path');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('../src/config');
const scheduler = require('../src/services/scheduler');

// React renderer for server-side rendering
const { 
  renderHomePage, 
  renderCollectionsPage, 
  renderProductsPage, 
  renderMetafieldsPage, 
  renderTemplatesPage 
} = require('./renderReact');

const app = express();
const port = config.PORT; // Consistent port usage from config

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES.split(','),
  hostName: process.env.HOST || `localhost:${port}`,
  hostScheme: 'https',
  apiVersion: ApiVersion.January24 || LATEST_API_VERSION,
  isEmbeddedApp: true,
});

// Middleware
app.use(express.json());
app.use(cookieParser(shopify.config.apiSecretKey));

// Serve static assets from the public folder
app.use(express.static(join(__dirname, '..', 'public')));

// In-memory session storage (for development)
const SESSION_STORAGE = new Map();

// Generate a random nonce for OAuth
const generateNonce = () => crypto.randomBytes(16).toString('hex');

// Auth route - starts OAuth process
app.get('/auth', async (req, res) => {
  const shop = req.query.shop;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }
  
  // Generate nonce and store in cookie
  const nonce = generateNonce();
  res.cookie('shopify_nonce', nonce, { signed: true });
  
  // Redirect to Shopify for auth
  const authUrl = await shopify.auth.begin({
    shop,
    callbackPath: '/auth/callback',
    isOnline: false,
    rawRequest: req,
    rawResponse: res,
  });
  
  res.redirect(authUrl);
});

// Auth callback route - completes OAuth process
app.get('/auth/callback', async (req, res) => {
  try {
    // Get nonce from cookie
    const nonce = req.signedCookies.shopify_nonce;
    
    // Complete OAuth process
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });
    
    // Store session
    const sessionKey = `${session.shop}_${session.isOnline ? 'online' : 'offline'}`;
    SESSION_STORAGE.set(sessionKey, session);
    
    // Clean up nonce
    res.clearCookie('shopify_nonce');
    
    // Redirect to app home
    res.redirect('/');
  } catch (error) {
    console.error('Error during auth callback:', error);
    res.status(500).send('Auth failed: ' + error.message);
  }
});

// API Routes - protected by authentication
app.use('/api', async (req, res, next) => {
  // For testing purposes, allow the preview API to work without authentication
  if (req.path === '/preview') {
    return next();
  }
  
  const shop = req.query.shop || process.env.SHOP;
  
  if (!shop) {
    return res.status(400).json({ error: 'Missing shop parameter' });
  }
  
  // Check if we have a session for this shop
  const sessionKey = `${shop}_offline`;
  const session = SESSION_STORAGE.get(sessionKey);
  
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Set session for API routes
  req.shopifySession = session;
  next();
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

<script>
  // Function to insert text at cursor position in the active element
  function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      activeElement.value = activeElement.value.substring(0, startPos) + 
                           text + 
                           activeElement.value.substring(endPos, activeElement.value.length);
      activeElement.selectionStart = activeElement.selectionEnd = startPos + text.length;
      activeElement.focus();
    }
  }
  
  // Function to insert a modifier at cursor position or after a variable
  function insertModifier(modifier) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const beforeCursor = activeElement.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          activeElement.value = activeElement.value.substring(0, variableEndPos) + 
                               modifier +
                               activeElement.value.substring(variableEndPos, activeElement.value.length);
          activeElement.selectionStart = activeElement.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
          activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
        activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
      }
      
      activeElement.focus();
    }
  }
</script>
</body></html>
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
          <input type="text" id="collectionTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
          <div class="character-count">
            <span id="collectionTitleCount">0</span> characters 
            <span class="badge" id="collectionTitleBadge">checking...</span>
            <span id="collectionTitleAdvice"></span>
          </div>
        </div>
        <div>
          <label for="collectionDescription">Meta Description Template</label>
          <textarea id="collectionDescription">Explore our {{collectionTitle}} for {{season}} {{year}}. {{if hasDiscount}}Save up to {{maxDiscountPercentage}} on selected items!{{else}}New arrivals now available.{{endif}}</textarea>
          <div class="character-count">
            <span id="collectionDescriptionCount">0</span> characters 
            <span class="badge" id="collectionDescriptionBadge">checking...</span>
            <span id="collectionDescriptionAdvice"></span>
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
          <input type="text" id="productTitle" value="{{productTitle}} - {{season}} {{year}} | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
          <div class="character-count">
            <span id="productTitleCount">0</span> characters 
            <span class="badge" id="productTitleBadge">checking...</span>
            <span id="productTitleAdvice"></span>
          </div>
        </div>
        <div>
          <label for="productDescription">Meta Description Template</label>
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

<script>
  // Function to insert text at cursor position in the active element
  function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      activeElement.value = activeElement.value.substring(0, startPos) + 
                           text + 
                           activeElement.value.substring(endPos, activeElement.value.length);
      activeElement.selectionStart = activeElement.selectionEnd = startPos + text.length;
      activeElement.focus();
    }
  }
  
  // Function to insert a modifier at cursor position or after a variable
  function insertModifier(modifier) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const beforeCursor = activeElement.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          activeElement.value = activeElement.value.substring(0, variableEndPos) + 
                               modifier +
                               activeElement.value.substring(variableEndPos, activeElement.value.length);
          activeElement.selectionStart = activeElement.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
          activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
        activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
      }
      
      activeElement.focus();
    }
  }
</script>
</body></html>
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
    }</style>
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
        <input type="text" id="collectionTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        <div class="character-count">
          <span id="collectionTitleCount">56</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div>
        <label for="collectionDescription">Meta Description Template</label>
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
          <input type="text" id="editTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="editDescription">Meta Description Template</label>
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
          <input type="text" id="scheduleTitle" value="{{collectionTitle}} - {{season}} {{year}} Collection | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="scheduleDescription">Meta Description Template</label>
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
          <input type="text" id="collectionRuleTitle" value="{{collectionTitle}} - SPECIAL {{season}} {{year}} | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="collectionRuleDescription">Meta Description Template</label>
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
  </script>

<script>
  // Function to insert text at cursor position in the active element
  function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      activeElement.value = activeElement.value.substring(0, startPos) + 
                           text + 
                           activeElement.value.substring(endPos, activeElement.value.length);
      activeElement.selectionStart = activeElement.selectionEnd = startPos + text.length;
      activeElement.focus();
    }
  }
  
  // Function to insert a modifier at cursor position or after a variable
  function insertModifier(modifier) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const beforeCursor = activeElement.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          activeElement.value = activeElement.value.substring(0, variableEndPos) + 
                               modifier +
                               activeElement.value.substring(variableEndPos, activeElement.value.length);
          activeElement.selectionStart = activeElement.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
          activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
        activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
      }
      
      activeElement.focus();
    }
  }
</script>
</body></html>
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
    }</style>
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
        <input type="text" id="productTitle" value="{{productTitle}} - {{season}} {{year}} | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        <div class="character-count">
          <span id="productTitleCount">46</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div>
        <label for="productDescription">Meta Description Template</label>
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
          <input type="text" id="editTitle" value="{{productTitle}} - {{season}} {{year}} | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="editDescription">Meta Description Template</label>
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
          <input type="text" id="scheduleTitle" value="{{productTitle}} - SALE {{season}} {{year}} | Your Store" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="scheduleDescription">Meta Description Template</label>
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
          <input type="text" id="ruleTitle" value="{{productTitle}} - SPECIAL {{season}} {{year}} | {{storeName}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="ruleDescription">Meta Description Template</label>
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
  </script>

<script>
  // Function to insert text at cursor position in the active element
  function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      activeElement.value = activeElement.value.substring(0, startPos) + 
                           text + 
                           activeElement.value.substring(endPos, activeElement.value.length);
      activeElement.selectionStart = activeElement.selectionEnd = startPos + text.length;
      activeElement.focus();
    }
  }
  
  // Function to insert a modifier at cursor position or after a variable
  function insertModifier(modifier) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const beforeCursor = activeElement.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          activeElement.value = activeElement.value.substring(0, variableEndPos) + 
                               modifier +
                               activeElement.value.substring(variableEndPos, activeElement.value.length);
          activeElement.selectionStart = activeElement.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
          activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
        activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
      }
      
      activeElement.focus();
    }
  }
</script>
</body></html>
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
  res.send(renderHomePage());
});

// Templates route
app.get('/templates', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderTemplatesPage());
});

// Collections route
app.get('/collections', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderCollectionsPage());
});

// Products route
app.get('/products', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderProductsPage());
});

// Metafields route
app.get('/metafields', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderMetafieldsPage());
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
        <input type="text" id="homeTitle" value="{{storeName}} - {{season}} {{year}} Collection" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        <div class="character-count">
          <span id="homeTitleCount">43</span> characters 
          <span class="badge good">Good length</span>
        </div>
      </div>
      
      <div>
        <label for="homeDescription">Meta Description Template</label>
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
  </script>
  
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
          <input type="text" id="scheduleTitle" value="{{storeName}} - SALE! Up to {{maxDiscountPercentage}} OFF {{season}} {{year}}" style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #ddd; margin-bottom: 5px;">
        </div>
        
        <div>
          <label for="scheduleDescription">Meta Description Template</label>
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

<script>
  // Function to insert text at cursor position in the active element
  function insertText(text) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      activeElement.value = activeElement.value.substring(0, startPos) + 
                           text + 
                           activeElement.value.substring(endPos, activeElement.value.length);
      activeElement.selectionStart = activeElement.selectionEnd = startPos + text.length;
      activeElement.focus();
    }
  }
  
  // Function to insert a modifier at cursor position or after a variable
  function insertModifier(modifier) {
    const activeElement = document.activeElement;
    if (activeElement.tagName.toLowerCase() === 'textarea' || 
        activeElement.tagName.toLowerCase() === 'input') {
      const startPos = activeElement.selectionStart;
      const endPos = activeElement.selectionEnd;
      const beforeCursor = activeElement.value.substring(0, startPos);
      
      // Check if there's a variable pattern before cursor
      const variablePattern = /\{\{([^}]+)\}\}/;
      const match = beforeCursor.match(variablePattern);
      
      if (match && match.index !== -1) {
        // Find the position right after the last variable closing }}
        const variableEndPos = beforeCursor.lastIndexOf('}}');
        if (variableEndPos !== -1 && variableEndPos === startPos - 2) {
          // Insert modifier right after the variable
          activeElement.value = activeElement.value.substring(0, variableEndPos) + 
                               modifier +
                               activeElement.value.substring(variableEndPos, activeElement.value.length);
          activeElement.selectionStart = activeElement.selectionEnd = variableEndPos + modifier.length + 2;
        } else {
          // Just insert at cursor if we're not right after a variable
          activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
          activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
        }
      } else {
        // Just insert at cursor if no variable pattern found
        activeElement.value = beforeCursor + modifier + activeElement.value.substring(endPos);
        activeElement.selectionStart = activeElement.selectionEnd = startPos + modifier.length;
      }
      
      activeElement.focus();
    }
  }
</script>
</body></html>
`;

// Homepage route
app.get('/homepage', (req, res) => {
  // For a real implementation, this would check for authentication
  res.send(renderHomePage());
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